// src/hooks/useClassificacoesTentativa.ts
//
// Sprint 3c — fecha o loop de aprendizado contínuo V2.
//
// CONTRATO:
//   Hook centraliza estado de classificação manual de rubricas pro
//   HoleritePreviewDialog + OntologiaClassificacaoBanner. Persiste em
//   `rubrica_aliases_tentativa` (escopo por-case, propaga entre holerites
//   do mesmo case e — após Confirmar — entre cases via `rubrica_aliases`).
//
// FONTES (em ordem de precedência decrescente):
//   1. `rubrica_aliases_tentativa` (decisões em andamento neste case)
//   2. Caller passa estado inicial de `rubricas_classificadas` do JSONB
//      (seed canônico, vem do mapper edge)
//
// Versão pré-4.4 lia também `documents.metadata.classificacoes_manuais_holerite`
// como shim legacy (escrita do banner pré-V2). Confirmado 0 entries em prod
// (dry-run em 5fa3a14) e banner novo não cria entries — shim removido.
//
// ESCRITA:
//   setClassificacao(normalized_key, categoria) é OTIMISTA:
//     1. Map local atualiza imediato (origem='session', saving=true)
//     2. Debounced UPSERT em `rubrica_aliases_tentativa` (800ms)
//     3. Sucesso: limpa saving, origem vira 'tentativa'
//     4. Falha: toast erro, mantém valor (operador refaz se quiser), saving=false
//
//   Cada normalized_key tem seu próprio timer — operador pode mexer em
//   várias linhas em paralelo sem reset cruzado.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type {
  CategoriaOntologiaRubricaV2,
  OntologiaSeedV2,
  RegrasCategoria,
  TipoPjeCalc,
} from '@/features/data-extraction/parsers/holerite/ontologia-rubricas-v2';
import { CATEGORIA_V1_TO_V2 } from '@/features/data-extraction/parsers/holerite/ontologia-rubricas-v2';
import seedV2 from '../../supabase/functions/_shared/holerite-mapper-v2/ontologia-v2.json';

const DEBOUNCE_MS = 800;

// Regras por categoria (tipo_pjecalc, base_dsr, base_13, base_ferias, incluido)
// derivadas do seed. Quando operador escolhe categoria nova, hook usa essas
// regras pra preencher os outros campos do UPSERT. Garante coerência entre
// classificação ontológica e tipo PJeCalc.
const CATEGORIA_RULES: Record<string, RegrasCategoria> = (
  seedV2 as OntologiaSeedV2
).categorias;

export type OrigemClassificacao = 'seed' | 'tentativa' | 'session';

export interface ClassificacaoLocal {
  normalized_key: string;
  alias_original: string;
  categoria: CategoriaOntologiaRubricaV2;
  tipo_pjecalc: TipoPjeCalc;
  origem: OrigemClassificacao;
  saving: boolean;
}

export interface SeedInicial {
  /** Nome original da rubrica (vai pra `alias_original` no UPSERT). */
  alias_original: string;
  /** Chave normalizada — bate com mapper V2 normalize(). */
  normalized_key: string;
  /** Categoria do mapper (V2). Pode vir como V1 do JSONB legado — shim aplica. */
  categoria: string;
  tipo_pjecalc: string;
}

export interface UseClassificacoesTentativaArgs {
  caseId: string | null | undefined;
  /** Document atual sendo conferido — preservado por compat. Antes do 4.4
   *  era usado pra hidratar shim legacy; agora não é mais lido. */
  documentId?: string | null;
  /** Seed inicial vindo do JSONB do mapper. Categoria pode estar em V1 — shim aplica. */
  rubricasIniciais: SeedInicial[];
}

export interface UseClassificacoesTentativaResult {
  classificacoes: Map<string, ClassificacaoLocal>;
  setClassificacao: (normalized_key: string, categoria: CategoriaOntologiaRubricaV2) => void;
  isLoading: boolean;
}

/**
 * Aplica shim V1→V2 num slug que possa vir do JSONB legado de `rubricas_classificadas`
 * (escrito por mapper edge antes do hard cut da migration #2 — ainda existe defesa
 * de leitura pra rows pré-migration que algum cliente possa segurar em cache).
 */
function normalizeCat(c: string): CategoriaOntologiaRubricaV2 {
  return (CATEGORIA_V1_TO_V2[c] ?? c) as CategoriaOntologiaRubricaV2;
}

export function useClassificacoesTentativa(
  args: UseClassificacoesTentativaArgs,
): UseClassificacoesTentativaResult {
  const { caseId, rubricasIniciais } = args;

  const [classificacoes, setClassificacoes] = useState<Map<string, ClassificacaoLocal>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Index normalized_key → {alias_original, tipo_pjecalc} pra UPSERT precisar
  // só do (case_id, normalized_key, categoria nova).
  const seedIndexRef = useRef<Map<string, SeedInicial>>(new Map());
  useEffect(() => {
    const m = new Map<string, SeedInicial>();
    for (const r of rubricasIniciais) m.set(r.normalized_key, r);
    seedIndexRef.current = m;
  }, [rubricasIniciais]);

  // Timers por normalized_key — debounce independente por linha.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup de timers no unmount.
  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  // Hidratação inicial: seed (rubricasIniciais) + tentativa (rubrica_aliases_tentativa).
  // Merge com precedência tentativa > seed.
  useEffect(() => {
    let cancelado = false;
    if (!caseId) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      const mapa = new Map<string, ClassificacaoLocal>();

      // 1. Seed (precedência menor)
      for (const r of rubricasIniciais) {
        mapa.set(r.normalized_key, {
          normalized_key: r.normalized_key,
          alias_original: r.alias_original,
          categoria: normalizeCat(r.categoria),
          tipo_pjecalc: r.tipo_pjecalc as TipoPjeCalc,
          origem: 'seed',
          saving: false,
        });
      }

      // 2. Tentativa (precedência maior)
      const { data: tentativas, error: errTent } = await supabase
        .from('rubrica_aliases_tentativa')
        .select('normalized_key, alias_original, categoria, tipo_pjecalc')
        .eq('case_id', caseId);
      if (errTent) {
        toast.error(`Erro ao carregar classificações em andamento: ${errTent.message}`);
      } else {
        for (const t of tentativas ?? []) {
          const atual = mapa.get(t.normalized_key);
          mapa.set(t.normalized_key, {
            normalized_key: t.normalized_key,
            alias_original: t.alias_original ?? atual?.alias_original ?? t.normalized_key,
            categoria: normalizeCat(t.categoria),
            tipo_pjecalc: (t.tipo_pjecalc ?? atual?.tipo_pjecalc ?? 'INDEFINIDO') as TipoPjeCalc,
            origem: 'tentativa',
            saving: false,
          });
        }
      }

      if (!cancelado) {
        setClassificacoes(mapa);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [caseId, rubricasIniciais]);

  const persistir = useCallback(
    async (entry: ClassificacaoLocal) => {
      if (!caseId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error('Sessão expirada — refaça login.');
        setClassificacoes((prev) => {
          const next = new Map(prev);
          const cur = next.get(entry.normalized_key);
          if (cur) next.set(entry.normalized_key, { ...cur, saving: false });
          return next;
        });
        return;
      }

      // Regras derivadas da categoria. NAO_CLASSIFICADO cai como INDEFINIDO
      // — não vai pra rubrica_aliases canônica (CHECK constraint rejeita).
      const regras = CATEGORIA_RULES[entry.categoria];
      const tipo_pjecalc: TipoPjeCalc =
        regras?.tipo_pjecalc ?? entry.tipo_pjecalc ?? 'INDEFINIDO';
      const base_dsr = regras?.base_dsr ?? false;
      const base_13 = regras?.base_13 ?? false;
      const base_ferias = regras?.base_ferias ?? false;
      const incluido = regras?.incluido ?? false;

      const { error } = await supabase.from('rubrica_aliases_tentativa').upsert(
        {
          case_id: caseId,
          normalized_key: entry.normalized_key,
          alias_original: entry.alias_original,
          categoria: entry.categoria,
          tipo_pjecalc,
          base_dsr,
          base_13,
          base_ferias,
          incluido,
          criado_por: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'case_id,normalized_key' },
      );

      setClassificacoes((prev) => {
        const next = new Map(prev);
        const cur = next.get(entry.normalized_key);
        if (!cur) return prev;
        if (error) {
          toast.error(`Falha ao salvar '${entry.alias_original}': ${error.message}`);
          next.set(entry.normalized_key, { ...cur, saving: false });
        } else {
          next.set(entry.normalized_key, {
            ...cur,
            tipo_pjecalc,
            saving: false,
            origem: 'tentativa',
          });
        }
        return next;
      });
    },
    [caseId],
  );

  const setClassificacao = useCallback(
    (normalized_key: string, categoria: CategoriaOntologiaRubricaV2) => {
      const seedEntry = seedIndexRef.current.get(normalized_key);
      if (!seedEntry) {
        // Não deveria acontecer: caller passa rubricasIniciais que contém todas
        // as keys que poderiam ser editadas.
        console.warn('[useClassificacoesTentativa] key sem seed:', normalized_key);
        return;
      }

      // Update otimista (origem='session', saving=true)
      setClassificacoes((prev) => {
        const next = new Map(prev);
        const cur = next.get(normalized_key) ?? {
          normalized_key,
          alias_original: seedEntry.alias_original,
          tipo_pjecalc: seedEntry.tipo_pjecalc as TipoPjeCalc,
          categoria,
          origem: 'session' as OrigemClassificacao,
          saving: true,
        };
        next.set(normalized_key, {
          ...cur,
          categoria,
          origem: 'session',
          saving: true,
        });
        return next;
      });

      // Debounce por key
      const prev = timersRef.current.get(normalized_key);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        timersRef.current.delete(normalized_key);
        // Pega snapshot atual via closure-free re-read
        setClassificacoes((curr) => {
          const entry = curr.get(normalized_key);
          if (entry) void persistir(entry);
          return curr;
        });
      }, DEBOUNCE_MS);
      timersRef.current.set(normalized_key, t);
    },
    [persistir],
  );

  return { classificacoes, setClassificacao, isLoading };
}
