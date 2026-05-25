import { useState, useMemo, useCallback } from 'react';
import Decimal from 'decimal.js';
import { supabase } from '@/integrations/supabase/client';
import type { RubricaEnriquecida } from '@/features/data-extraction/enrichment/enrich-ficha-financeira';
import {
  type FichaFinanceiraParsed,
  type FichaCategoriaSlug,
  CATEGORIA_PJE_TO_SLUG,
} from '../ficha-financeira-types';

Decimal.set({ precision: 20 });

export interface RubricaEditavel extends RubricaEnriquecida {
  categoria_atual: FichaCategoriaSlug;
  incluida: boolean;
  modificada_pelo_operador: boolean;
  justificativa?: string;
  total_ano: Decimal;
}

function derivarCategoriaInicial(r: RubricaEnriquecida): FichaCategoriaSlug {
  const mapped = r.categoria_catalogo
    ? CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo]
    : r.categoria
      ? CATEGORIA_PJE_TO_SLUG[r.categoria]
      : null;
  if (mapped) return mapped;
  if (r.classificacao?.toUpperCase() !== 'PGTO') return 'ignorar';
  return 'salario_fixo';
}

function buildEditavel(r: RubricaEnriquecida): RubricaEditavel {
  const cat = derivarCategoriaInicial(r);
  const total = r.valores_mensais.reduce(
    (acc, v) => acc.plus(new Decimal(v.valor)),
    new Decimal(0),
  );
  return {
    ...r,
    categoria_atual: cat,
    incluida: cat !== 'ignorar',
    modificada_pelo_operador: false,
    total_ano: total,
  };
}

function isNaoClassificada(r: RubricaEditavel): boolean {
  return (
    r.origem_enriquecimento === 'nao_encontrado' &&
    !r.modificada_pelo_operador &&
    r.classificacao?.toUpperCase() === 'PGTO'
  );
}

const SLUG_TO_CATEGORIA_PJE: Record<FichaCategoriaSlug, string> = {
  salario_fixo: 'salario_base',
  comissao: 'comissao',
  dsr: 'dsr_comissao',
  premiacao: 'premio',
  minimo_garantido: 'minimo_garantido',
  salario_familia: 'salario_familia',
  ignorar: 'desconto',
};

export interface SalvarResult {
  salvas: number;
  erros: string[];
  conflitos: Array<{ codigo: string; motivo: string }>;
}

export function useFichaFinanceiraReview(parsed: FichaFinanceiraParsed) {
  const [rubricas, setRubricas] = useState<RubricaEditavel[]>(() =>
    parsed.rubricas.map(buildEditavel),
  );

  const setCategoria = useCallback(
    (codigo: string, novaCategoria: FichaCategoriaSlug, justificativa?: string) => {
      setRubricas((prev) =>
        prev.map((r) =>
          r.codigo === codigo
            ? {
                ...r,
                categoria_atual: novaCategoria,
                incluida: novaCategoria !== 'ignorar',
                modificada_pelo_operador: true,
                justificativa,
              }
            : r,
        ),
      );
    },
    [],
  );

  const toggleIncluida = useCallback((codigo: string) => {
    setRubricas((prev) =>
      prev.map((r) =>
        r.codigo === codigo ? { ...r, incluida: !r.incluida, modificada_pelo_operador: true } : r,
      ),
    );
  }, []);

  const totaisPorCategoria = useMemo(() => {
    const map = new Map<FichaCategoriaSlug, Decimal>();
    for (const r of rubricas) {
      if (!r.incluida) continue;
      const curr = map.get(r.categoria_atual) ?? new Decimal(0);
      map.set(r.categoria_atual, curr.plus(r.total_ano));
    }
    return map;
  }, [rubricas]);

  const totaisPorMes = useMemo(() => {
    const map = new Map<string, Decimal>();
    for (const r of rubricas) {
      if (!r.incluida) continue;
      for (const v of r.valores_mensais) {
        const curr = map.get(v.competencia) ?? new Decimal(0);
        map.set(v.competencia, curr.plus(new Decimal(v.valor)));
      }
    }
    return map;
  }, [rubricas]);

  const rubricasNaoClassificadas = useMemo(
    () => rubricas.filter(isNaoClassificada).length,
    [rubricas],
  );

  const conflitos = useMemo(
    () =>
      rubricas.filter(
        (r) =>
          r.modificada_pelo_operador &&
          r.origem_enriquecimento === 'catalogo' &&
          r.categoria_atual !== derivarCategoriaInicial(r),
      ).length,
    [rubricas],
  );

  const podeConfirmar = rubricasNaoClassificadas === 0;

  const mesesOrdenados = useMemo(() => {
    const meses = new Set<string>();
    for (const r of rubricas) {
      for (const v of r.valores_mensais) {
        meses.add(v.competencia);
      }
    }
    return [...meses].sort();
  }, [rubricas]);

  const salvarClassificacoes = useCallback(async (): Promise<SalvarResult> => {
    const modificadas = rubricas.filter((r) => r.modificada_pelo_operador);
    if (modificadas.length === 0) {
      return { salvas: 0, erros: [], conflitos: [] };
    }

    const empregador = parsed._meta?.empregador_detectado ?? 'GENERICO';

    const { data, error } = await supabase.functions.invoke('ficha-classify-confirm', {
      body: {
        codigos: modificadas.map((r) => ({
          codigo: r.codigo,
          empregador,
          denominacao: r.denominacao,
          categoria_pje: SLUG_TO_CATEGORIA_PJE[r.categoria_atual] ?? r.categoria_atual,
          classe_documento: r.classificacao || 'PGTO',
          incide_fgts: r.incide_fgts,
          incide_inss: r.incide_inss,
          incide_ir: r.incide_ir,
          natureza_indenizatoria: r.natureza_indenizatoria,
          justificativa: r.justificativa,
        })),
      },
    });

    if (error) {
      return { salvas: 0, erros: [error.message], conflitos: [] };
    }

    return {
      salvas: data?.salvas ?? 0,
      erros: [],
      conflitos: data?.conflitos ?? [],
    };
  }, [rubricas, parsed._meta?.empregador_detectado]);

  return {
    rubricas,
    setCategoria,
    toggleIncluida,
    totaisPorCategoria,
    totaisPorMes,
    rubricasNaoClassificadas,
    conflitos,
    podeConfirmar,
    mesesOrdenados,
    salvarClassificacoes,
  };
}
