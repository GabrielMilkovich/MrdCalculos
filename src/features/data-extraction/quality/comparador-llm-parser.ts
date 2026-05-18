/**
 * FASE 3.1 — comparador parser determinístico × LLM extractor.
 *
 * Estratégia:
 *   1. Para cada rubrica do parser, procura match no LLM por nome
 *      normalizado (lowercase, sem acento, trim, espaços colapsados).
 *      Levenshtein ≤ 3 → considera mesma rubrica.
 *   2. Compara valores monetários com Decimal (tolerância 0.01).
 *   3. Rubricas parser-only / LLM-only / diff_nome / diff_valor.
 *   4. taxa_concordancia = matches / max(parser.length, llm.length).
 *
 * Algoritmo de matching é gananciosamente bipartite (greedy 1-to-1):
 * cada rubrica do parser consome no máximo 1 rubrica do LLM. Sem
 * heurística complexa — para o uso real (5–30 rubricas por holerite),
 * O(n²) é trivial.
 */

import Decimal from "decimal.js";
import type { RubricaParseada } from "../parsers/holerite/types";
import type {
  ExtractedRubrica,
  ExtractedTotalizadores,
} from "../api/extract-rubricas-ai";

// ============================================================
// Tipos
// ============================================================

export type LinhaMatch =
  | { tipo: "match"; parser: RubricaParseada; llm: ExtractedRubrica }
  | { tipo: "so_parser"; parser: RubricaParseada }
  | { tipo: "so_llm"; llm: ExtractedRubrica }
  | {
      tipo: "diff_valor";
      parser: RubricaParseada;
      llm: ExtractedRubrica;
      delta: Decimal;
    }
  | {
      tipo: "diff_nome";
      parser: RubricaParseada;
      llm: ExtractedRubrica;
      levenshtein: number;
    };

export interface ComparacaoResultado {
  matches: LinhaMatch[];
  totalParser: number;
  totalLlm: number;
  /** 0..1. Considera APENAS `tipo: 'match'` no numerador. */
  taxa_concordancia: number;
  /** Reservado para integração com totalizadores do LLM (FASE 3.2). */
  totalizadores_match?: {
    bruto: boolean;
    descontos: boolean;
    liquido: boolean;
  };
}

// ============================================================
// Levenshtein inline — 30 linhas, sem dependência externa
// ============================================================

/**
 * Distância de Levenshtein (edit distance). Implementação dinâmica O(m*n).
 * Para os 30 chars típicos de nome de rubrica, suficientemente rápida.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  // Linha anterior + linha atual (otimização O(min(m,n)) memória).
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ============================================================
// Normalização
// ============================================================

/**
 * Normaliza nome de rubrica para comparação:
 *   - lowercase
 *   - remove acentos (NFD + remove diacríticos)
 *   - trim + colapsa espaços
 *   - remove pontuação comum (./-)
 */
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// Comparação
// ============================================================

const LEVENSHTEIN_MAX_MATCH = 3;
const DELTA_VALOR_MAX = new Decimal("0.01");

/**
 * Decide o tipo de match entre duas rubricas (parser + llm) que casaram
 * por nome (levenshtein ≤ 3).
 *
 * Compara `valor_vencimento` (principal). Se um lado é null e outro tem
 * valor, conta como diff_valor com delta = |valor|.
 */
function classificarMatchPorValor(
  parser: RubricaParseada,
  llm: ExtractedRubrica,
  distNome: number,
): LinhaMatch {
  const pVenc = parser.valor_vencimento ?? 0;
  const lVenc = llm.valor_vencimento ?? 0;
  const delta = new Decimal(pVenc).minus(lVenc).abs();

  if (delta.lessThanOrEqualTo(DELTA_VALOR_MAX)) {
    // Valores batem. Se nome também idêntico → match. Senão → diff_nome.
    if (distNome === 0) {
      return { tipo: "match", parser, llm };
    }
    return { tipo: "diff_nome", parser, llm, levenshtein: distNome };
  }
  // Valores divergem → diff_valor (independe da exatidão do nome).
  return { tipo: "diff_valor", parser, llm, delta };
}

/**
 * Comparador greedy 1-para-1. Cada rubrica do parser tenta casar com a
 * rubrica do LLM ainda não consumida cuja distância de Levenshtein é
 * menor (até o teto LEVENSHTEIN_MAX_MATCH).
 *
 * Pós-condição: matches.length === parserRubricas.length +
 * llmRubricas.filter(unmatched).length. Cada rubrica aparece em
 * exatamente UM item de matches (match, diff_*, so_parser, so_llm).
 */
export function compararRubricas(
  parserRubricas: ReadonlyArray<RubricaParseada>,
  llmRubricas: ReadonlyArray<ExtractedRubrica>,
): ComparacaoResultado {
  const matches: LinhaMatch[] = [];
  const llmConsumido = new Set<number>();

  // Pre-compute nomes normalizados para LLM.
  const llmNomesNorm = llmRubricas.map((l) => normalizarNome(l.nome));

  // 1. Match parser → LLM (greedy: menor distância dentro do teto).
  for (const p of parserRubricas) {
    const nomeP = normalizarNome(p.nome);
    let melhorIdx = -1;
    let melhorDist = LEVENSHTEIN_MAX_MATCH + 1;
    for (let j = 0; j < llmRubricas.length; j++) {
      if (llmConsumido.has(j)) continue;
      const d = levenshtein(nomeP, llmNomesNorm[j]);
      if (d < melhorDist) {
        melhorDist = d;
        melhorIdx = j;
      }
    }
    if (melhorIdx === -1 || melhorDist > LEVENSHTEIN_MAX_MATCH) {
      matches.push({ tipo: "so_parser", parser: p });
      continue;
    }
    llmConsumido.add(melhorIdx);
    matches.push(
      classificarMatchPorValor(p, llmRubricas[melhorIdx], melhorDist),
    );
  }

  // 2. Rubricas do LLM que ninguém consumiu → so_llm.
  for (let j = 0; j < llmRubricas.length; j++) {
    if (!llmConsumido.has(j)) {
      matches.push({ tipo: "so_llm", llm: llmRubricas[j] });
    }
  }

  // 3. Taxa de concordância: APENAS `tipo: 'match'`. diff_nome e diff_valor
  // são considerados divergências para fins de UI ("operador decide").
  const totalParser = parserRubricas.length;
  const totalLlm = llmRubricas.length;
  const matchesPuros = matches.filter((m) => m.tipo === "match").length;
  const denom = Math.max(totalParser, totalLlm);
  const taxa = denom === 0 ? 1 : matchesPuros / denom;

  return {
    matches,
    totalParser,
    totalLlm,
    taxa_concordancia: taxa,
  };
}

/**
 * Comparação dos totalizadores (FASE 3.1+3.2): bate quando ambos têm
 * valor e delta ≤ 0.01. Quando um lado é null, FALSE (não dá pra concluir).
 */
export function compararTotalizadores(
  parserBruto: number | null,
  parserDescontos: number | null,
  parserLiquido: number | null,
  llm: ExtractedTotalizadores,
): { bruto: boolean; descontos: boolean; liquido: boolean } {
  const cmp = (a: number | null, b: number | null): boolean => {
    if (a === null || b === null) return false;
    return new Decimal(a).minus(b).abs().lessThanOrEqualTo(DELTA_VALOR_MAX);
  };
  return {
    bruto: cmp(parserBruto, llm.bruto),
    descontos: cmp(parserDescontos, llm.descontos),
    liquido: cmp(parserLiquido, llm.liquido),
  };
}
