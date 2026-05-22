/**
 * Dispatcher de mappers.
 *
 * Recebe um `DocumentoTabular` e (opcionalmente) o tipo já detectado pelo
 * auto-detect. Escolhe o mapper com maior score de detecção.
 *
 * Quando nenhum mapper aplica (`aplica=false`), devolve null e o pipeline
 * cai pro fallback v5 (parsers regex sobre OCR/texto-nativo).
 *
 * Sprint 3 (2026-05-22): novo entry-point `escolherEMapear` encapsula a
 * lógica de "rodar AMBOS mappers de cartão de ponto + merge" pra PDFs
 * híbridos (Via Varejo Antigo + Espelho Minha). Pra outros tipos
 * (holerite, ferias, etc.) o comportamento é idêntico ao antigo.
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, TipoDocumentoMapper } from './index.ts';
import type { ParseCartaoPontoResultDominio } from '../tipos-dominio.ts';

import { mapperCartaoViaVarejo } from './cartao-ponto-via-varejo.ts';
import { mapperCartaoViaVarejoMinha } from './cartao-ponto-via-varejo-minha.ts';
import { mapperCartaoGenerico } from './cartao-ponto-generico.ts';
import { mapperHoleriteViaVarejo } from './holerite-via-varejo.ts';
import { mapperHoleriteGenerico } from './holerite-generico.ts';
import { mapperReciboFerias } from './recibo-ferias.ts';
import { mapperRegistroFaltas } from './registro-faltas.ts';
import { mapperCtps } from './ctps.ts';
import { mesclarResultadosCartaoPonto } from './merge-cartao-ponto.ts';

const TODOS_MAPPERS: Array<Mapper<unknown>> = [
  mapperCartaoViaVarejo,
  mapperCartaoViaVarejoMinha,
  mapperCartaoGenerico,
  mapperHoleriteViaVarejo,
  mapperHoleriteGenerico,
  mapperReciboFerias,
  mapperRegistroFaltas,
  mapperCtps,
];

export interface DispatchResult {
  mapper: Mapper<unknown>;
  score: number;
  motivos: string[];
}

/**
 * Escolhe o melhor mapper aplicável.
 * Quando `tipoForcado` é provido, filtra apenas mappers daquele tipo.
 *
 * Preservada inalterada por compatibilidade (tests em v6-mappers.test.ts
 * e qualquer caller futuro que só quer saber "qual mapper venceria").
 */
export function escolherMapper(
  doc: DocumentoTabular,
  tipoForcado?: TipoDocumentoMapper,
): DispatchResult | null {
  const candidatos = TODOS_MAPPERS
    .filter((m) => !tipoForcado || m.tipoDocumento === tipoForcado)
    .map((m) => ({ mapper: m, deteccao: m.detectar(doc) }))
    .filter((c) => c.deteccao.aplica)
    .sort((a, b) => b.deteccao.score - a.deteccao.score);

  if (candidatos.length === 0) return null;
  const melhor = candidatos[0];
  return {
    mapper: melhor.mapper,
    score: melhor.deteccao.score,
    motivos: melhor.deteccao.motivos,
  };
}

/**
 * Slugs dos mappers de cartão de ponto considerados FALLBACK genérico.
 * Esses só são acionados quando nenhum mapper ESPECÍFICO (por empregador)
 * aplica. Em PDFs híbridos (ex.: Via Varejo Antigo + Minha), o merge
 * roda apenas os específicos — o genérico ficaria sem contexto suficiente
 * pra extrair corretamente o layout específico.
 */
const SLUGS_FALLBACK_CARTAO_PONTO = new Set<string>([
  'cartao_generico_v1',
]);

/**
 * Sprint 3 — retorna os mappers tipo `cartao_ponto` aplicáveis ao doc.
 *
 * Regra de fallback: se algum mapper ESPECÍFICO (não-fallback) aplica,
 * fallbacks (`cartao_generico_v1`) ficam DE FORA. Senão, fallback assume
 * sozinho. Garante que PDFs Via Varejo híbridos rodem só os 2 Via Varejo
 * (sem ruído do genérico) E que PDFs de outro empregador caiam pro
 * genérico sem competição.
 */
export function escolherMappersCartaoPonto(
  doc: DocumentoTabular,
): DispatchResult[] {
  const todosAplicaveis = TODOS_MAPPERS
    .filter((m) => m.tipoDocumento === 'cartao_ponto')
    .map((m) => ({ mapper: m, deteccao: m.detectar(doc) }))
    .filter((c) => c.deteccao.aplica)
    .sort((a, b) => b.deteccao.score - a.deteccao.score)
    .map((c) => ({
      mapper: c.mapper,
      score: c.deteccao.score,
      motivos: c.deteccao.motivos,
    }));

  const especificos = todosAplicaveis.filter(
    (r) => !SLUGS_FALLBACK_CARTAO_PONTO.has(r.mapper.slug),
  );
  // Se algum específico aplica, fallback fica de fora. Senão, retorna tudo
  // (que será só o fallback).
  return especificos.length > 0 ? especificos : todosAplicaveis;
}

/**
 * Resultado executado: mapper já rodado + dados pra logging/persistência.
 *
 * `slug` reflete a origem:
 *   - 1 mapper: slug do mapper único
 *   - merge de 2+ mappers de cartão de ponto: slug do mapper de MAIOR
 *     score (preserva semântica do `documents.parsed_by` pra downstream
 *     que faz `LIKE 'cartao_via_varejo%'`).
 *   `mappers_executados` lista todos pra rastreabilidade.
 *
 * Se for merge real, o `parser_version` dentro de `resultado` vira
 * `merged:v7.3+v1` (ver mesclarResultadosCartaoPonto).
 */
export interface DispatchExecutado {
  resultado: unknown;
  slug: string;
  score: number;
  motivos: string[];
  /** Lista de mappers que rodaram. 1 elemento em casos não-híbridos. */
  mappers_executados: string[];
}

/**
 * Outcome rico do escolherEMapear — preserva distinção telemétrica
 * entre "detector rejeitou todos" e "detector aceitou mas parsing falhou".
 * Callsites discriminam via `kind`.
 */
export type EscolherEMapearOutcome =
  | { kind: 'success'; executado: DispatchExecutado }
  | { kind: 'no_mapper_matched' }
  | {
      kind: 'mapper_returned_null';
      /** Mappers que detector aprovou mas mapear() retornou null. Útil pra log. */
      tentados: DispatchResult[];
    };

/**
 * Sprint 3 (2026-05-22) — entry-point principal pra produção.
 *
 * Para tipos != cartao_ponto: comportamento idêntico ao `escolherMapper`
 * + chamar `mapear()` (atomicidade pra callers).
 *
 * Para cartao_ponto: se 1 mapper aplica, roda só ele. Se 2+ aplicam
 * (PDFs híbridos), roda TODOS, descarta os que retornaram null, e mescla
 * os resultantes via `mesclarResultadosCartaoPonto`. Slug retornado é
 * o do mapper de maior score (compat downstream).
 *
 * Retorna discriminated union — callsites distinguem entre "nenhum mapper
 * aplicou" e "mapper aplicou mas parsing falhou" pra logging granular.
 */
export function escolherEMapear(doc: DocumentoTabular): EscolherEMapearOutcome {
  const melhor = escolherMapper(doc);
  if (!melhor) return { kind: 'no_mapper_matched' };

  if (melhor.mapper.tipoDocumento !== 'cartao_ponto') {
    // Single-mapper path — comportamento clássico
    const resultado = melhor.mapper.mapear(doc);
    if (!resultado) {
      return { kind: 'mapper_returned_null', tentados: [melhor] };
    }
    return {
      kind: 'success',
      executado: {
        resultado,
        slug: melhor.mapper.slug,
        score: melhor.score,
        motivos: melhor.motivos,
        mappers_executados: [melhor.mapper.slug],
      },
    };
  }

  // Cartão de ponto: pode ter múltiplos mappers aplicando (PDF híbrido).
  const aplicaveis = escolherMappersCartaoPonto(doc);
  if (aplicaveis.length === 0) {
    // Não deve acontecer (escolherMapper já achou algo de cartao_ponto),
    // mas defensivo: trata como no_mapper_matched.
    return { kind: 'no_mapper_matched' };
  }

  // Roda cada mapper aplicável, coleta resultados não-null
  const executados: Array<{
    slug: string;
    score: number;
    motivos: string[];
    resultado: ParseCartaoPontoResultDominio;
  }> = [];
  for (const d of aplicaveis) {
    const r = d.mapper.mapear(doc) as ParseCartaoPontoResultDominio | null;
    if (r !== null) {
      executados.push({
        slug: d.mapper.slug,
        score: d.score,
        motivos: d.motivos,
        resultado: r,
      });
    }
  }

  if (executados.length === 0) {
    return { kind: 'mapper_returned_null', tentados: aplicaveis };
  }

  // Apenas um mapper produziu resultado: caminho single (sem envelope merged:).
  if (executados.length === 1) {
    const e = executados[0];
    return {
      kind: 'success',
      executado: {
        resultado: e.resultado,
        slug: e.slug,
        score: e.score,
        motivos: e.motivos,
        mappers_executados: [e.slug],
      },
    };
  }

  // 2+ resultados: mescla.
  const mesclado = mesclarResultadosCartaoPonto(
    executados.map((e) => ({ slug: e.slug, resultado: e.resultado })),
  );
  if (!mesclado) {
    // Defensivo — mesclarResultadosCartaoPonto não deveria retornar null
    // quando recebe >=1 entrada. Se aconteceu, log e cai como falha.
    return { kind: 'mapper_returned_null', tentados: aplicaveis };
  }

  // Slug: do mapper de MAIOR score (executados[0], já ordenado).
  // Motivos: prefixados por slug pra logging completo.
  return {
    kind: 'success',
    executado: {
      resultado: mesclado,
      slug: executados[0].slug,
      score: executados[0].score,
      motivos: executados.flatMap((e) => [`[${e.slug}]`, ...e.motivos]),
      mappers_executados: executados.map((e) => e.slug),
    },
  };
}

export function listarMappers(): Mapper<unknown>[] {
  return [...TODOS_MAPPERS];
}
