/**
 * =====================================================
 * DEBT EVOLUTION — Month-by-month debt evolution analysis
 * =====================================================
 *
 * Generates a time-series of debt evolution from a PjeLiquidacaoResult,
 * breaking down principal, correction, interest, and total accumulation
 * over time. Used for debt evolution chart and report.
 */

import Decimal from "decimal.js";
import type {
  PjeLiquidacaoResult,
  PjeCorrecaoConfig,
  PjeVerbaResult,
  PjeOcorrenciaResult,
} from "./engine-types";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// --- Types ---

export interface DebtEvolutionEntry {
  /** Competencia in YYYY-MM format */
  competencia: string;
  /** Accumulated principal (diferencas) up to this month */
  principal_acumulado: number;
  /** Accumulated monetary correction up to this month */
  correcao_acumulada: number;
  /** Accumulated interest up to this month */
  juros_acumulados: number;
  /** Total accumulated debt (principal + correcao + juros) */
  total_acumulado: number;
  /** Monthly variation in total debt */
  variacao_mensal: number;
  /** Monthly variation as percentage */
  variacao_percentual: number;
}

export interface DebtEvolutionSummary {
  /** Total number of months in the evolution */
  total_meses: number;
  /** First competencia with a debt entry */
  competencia_inicial: string;
  /** Last competencia */
  competencia_final: string;
  /** Total growth from first to last entry */
  crescimento_total: number;
  /** Total growth as percentage */
  crescimento_total_pct: number;
  /** Average monthly growth rate (%) */
  taxa_mensal_media: number;
  /** Maximum monthly increase */
  maior_variacao_mensal: number;
  /** Month of maximum increase */
  competencia_maior_variacao: string;
}

export interface DebtEvolutionResult {
  entries: DebtEvolutionEntry[];
  summary: DebtEvolutionSummary;
}

// --- Calculation ---

/**
 * Generate month-by-month debt evolution from liquidation results.
 *
 * Extracts all occurrences from all verbas, groups by competencia,
 * and builds cumulative series for principal, correction, and interest.
 */
export function calcularEvolucaoDebito(
  result: PjeLiquidacaoResult,
  _correcaoConfig?: PjeCorrecaoConfig
): DebtEvolutionResult {
  // Collect all occurrences from all verbas
  const monthlyData = new Map<
    string,
    { principal: Decimal; correcao: Decimal; juros: Decimal }
  >();

  for (const verba of result.verbas) {
    for (const occ of verba.ocorrencias) {
      const comp = occ.competencia.slice(0, 7); // YYYY-MM
      const existing = monthlyData.get(comp) || {
        principal: new Decimal(0),
        correcao: new Decimal(0),
        juros: new Decimal(0),
      };

      const diferenca = new Decimal(occ.diferenca);
      const correcao = new Decimal(occ.valor_corrigido).sub(occ.diferenca);
      const juros = new Decimal(occ.juros);

      existing.principal = existing.principal.add(diferenca);
      existing.correcao = existing.correcao.add(correcao);
      existing.juros = existing.juros.add(juros);

      monthlyData.set(comp, existing);
    }
  }

  // Sort months chronologically
  const sortedMonths = Array.from(monthlyData.keys()).sort();

  if (sortedMonths.length === 0) {
    return {
      entries: [],
      summary: {
        total_meses: 0,
        competencia_inicial: "",
        competencia_final: "",
        crescimento_total: 0,
        crescimento_total_pct: 0,
        taxa_mensal_media: 0,
        maior_variacao_mensal: 0,
        competencia_maior_variacao: "",
      },
    };
  }

  // Build cumulative entries
  const entries: DebtEvolutionEntry[] = [];
  let cumPrincipal = new Decimal(0);
  let cumCorrecao = new Decimal(0);
  let cumJuros = new Decimal(0);
  let prevTotal = new Decimal(0);
  let maxVariacao = new Decimal(0);
  let maxVariacaoComp = sortedMonths[0];

  for (const comp of sortedMonths) {
    const data = monthlyData.get(comp)!;

    cumPrincipal = cumPrincipal.add(data.principal);
    cumCorrecao = cumCorrecao.add(data.correcao);
    cumJuros = cumJuros.add(data.juros);

    const total = cumPrincipal.add(cumCorrecao).add(cumJuros);
    const variacao = total.sub(prevTotal);
    const variacaoPct = prevTotal.isZero()
      ? new Decimal(0)
      : variacao.div(prevTotal).mul(100);

    if (variacao.abs().gt(maxVariacao.abs())) {
      maxVariacao = variacao;
      maxVariacaoComp = comp;
    }

    entries.push({
      competencia: comp,
      principal_acumulado: cumPrincipal
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      correcao_acumulada: cumCorrecao
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      juros_acumulados: cumJuros
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      total_acumulado: total
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      variacao_mensal: variacao
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      variacao_percentual: variacaoPct
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
        .toNumber(),
    });

    prevTotal = total;
  }

  // Summary
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  const crescimentoTotal = lastEntry.total_acumulado - (firstEntry.principal_acumulado || 0);
  const crescimentoPct =
    firstEntry.principal_acumulado !== 0
      ? ((lastEntry.total_acumulado - firstEntry.principal_acumulado) /
          Math.abs(firstEntry.principal_acumulado)) *
        100
      : 0;

  // Average monthly growth rate
  const taxaMensalMedia =
    entries.length > 1
      ? entries
          .slice(1)
          .reduce((sum, e) => sum + e.variacao_percentual, 0) /
        (entries.length - 1)
      : 0;

  return {
    entries,
    summary: {
      total_meses: entries.length,
      competencia_inicial: sortedMonths[0],
      competencia_final: sortedMonths[sortedMonths.length - 1],
      crescimento_total: parseFloat(crescimentoTotal.toFixed(2)),
      crescimento_total_pct: parseFloat(crescimentoPct.toFixed(2)),
      taxa_mensal_media: parseFloat(taxaMensalMedia.toFixed(4)),
      maior_variacao_mensal: maxVariacao
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toNumber(),
      competencia_maior_variacao: maxVariacaoComp,
    },
  };
}

/**
 * Export debt evolution to CSV string.
 */
export function exportarEvolucaoCSV(entries: DebtEvolutionEntry[]): string {
  const header =
    "Competencia;Principal Acumulado;Correcao Acumulada;Juros Acumulados;Total Acumulado;Variacao Mensal;Variacao %";
  const rows = entries.map(
    (e) =>
      `${e.competencia};${e.principal_acumulado.toFixed(2)};${e.correcao_acumulada.toFixed(2)};${e.juros_acumulados.toFixed(2)};${e.total_acumulado.toFixed(2)};${e.variacao_mensal.toFixed(2)};${e.variacao_percentual.toFixed(4)}`
  );
  return [header, ...rows].join("\n");
}
