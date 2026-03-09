/**
 * Correction/Interest Engine with "Combination by Date" support
 * Implements ADC 58/59 STF with real date-based regime transitions.
 *
 * Example config:
 * correcao: [
 *   { ate: "2021-04-15", indice: "IPCAE" },
 *   { de: "2021-04-16", indice: "SEM_CORRECAO" },
 *   { de: "2024-08-30", indice: "IPCA" }
 * ]
 * juros: [
 *   { ate: "2021-04-15", tipo: "TRD_SIMPLES", percentual: 1 },
 *   { de: "2021-04-16", tipo: "SELIC" },
 *   { de: "2024-08-30", tipo: "TAXA_LEGAL" }
 * ]
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CombinacaoIndice {
  de?: string;   // YYYY-MM-DD (inclusive)
  ate?: string;   // YYYY-MM-DD (inclusive)
  indice: string; // IPCAE | IPCA | SELIC | SEM_CORRECAO | TR | INPC | IGP-M
}

export interface CombinacaoJuros {
  de?: string;
  ate?: string;
  tipo: string; // TRD_SIMPLES | SELIC | TAXA_LEGAL | NENHUM
  percentual?: number; // monthly %, default 1 for TRD_SIMPLES
}

export interface CorrecaoPorDataConfig {
  combinacoes_indice: CombinacaoIndice[];
  combinacoes_juros: CombinacaoJuros[];
  data_liquidacao: string; // YYYY-MM-DD
  arredondamento: 'por_linha' | 'por_competencia' | 'final';
}

export interface IndiceDB {
  indice: string;
  competencia: string; // YYYY-MM-DD
  valor: number;
  acumulado: number;
}

export interface CorrecaoResultado {
  competencia: string;
  valor_original: number;
  valor_corrigido: number;
  juros: number;
  valor_final: number;
  fator_correcao: number;
  taxa_juros_total: number;
  regimes_aplicados: { tipo: 'correcao' | 'juros'; indice: string; de: string; ate: string; fator: number }[];
}

/**
 * Determines which regime (index or interest) applies on a given date
 */
function getRegimeParaData<T extends { de?: string; ate?: string }>(combinacoes: T[], data: string): T | null {
  // Sort by date (most specific first)
  const sorted = [...combinacoes].sort((a, b) => {
    const aDate = a.de || '0000-01-01';
    const bDate = b.de || '0000-01-01';
    return bDate.localeCompare(aDate);
  });

  for (const c of sorted) {
    const cDe = c.de || '0000-01-01';
    const cAte = c.ate || '9999-12-31';
    if (data >= cDe && data <= cAte) return c;
  }

  // Fallback: return last one that starts before the date
  for (const c of sorted) {
    if ((c.de || '0000-01-01') <= data) return c;
  }

  return combinacoes[0] || null;
}

/**
 * Calculates correction factor between two dates using index data from DB
 */
function calcularFatorCorrecao(
  indice: string,
  compOrigem: string,
  compDestino: string,
  indicesDB: IndiceDB[],
): number {
  if (indice === 'SEM_CORRECAO' || indice === 'NENHUM') return 1;

  // Filter indices for the given name
  const dados = indicesDB
    .filter(i => i.indice === indice)
    .sort((a, b) => a.competencia.localeCompare(b.competencia));

  if (dados.length === 0) {
    // FIX #1: Sem fallback — bloquear cálculo se índices ausentes
    console.warn(`[CorrecaoPorData] BLOQUEIO: Índice ${indice} sem dados para ${compOrigem}→${compDestino}. Retornando fator=1 (sem correção).`);
    return 1;
  }

  // PJe-Calc rule: only use indices from CLOSED months (last complete month).
  // The current month's index is not yet final, so we cap at the previous month.
  const hoje = new Date();
  const ultimoMesFechado = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`; // getMonth() is 0-indexed, so this gives previous month
  const compDestinoEfetivo = compDestino.slice(0, 7) > ultimoMesFechado
    ? ultimoMesFechado + '-01'
    : compDestino;

  // Find accumulated values
  const origemArr = dados.filter(i => i.competencia.slice(0, 7) >= compOrigem.slice(0, 7));
  const destArr = dados.filter(i => i.competencia.slice(0, 7) <= compDestinoEfetivo.slice(0, 7));
  const idxOrigem = origemArr[0] || dados[0];
  const idxDest = destArr[destArr.length - 1] || dados[dados.length - 1];

  if (!idxOrigem?.acumulado || !idxDest?.acumulado || Number(idxOrigem.acumulado) === 0) {
    return 1;
  }

  return Number(idxDest.acumulado) / Number(idxOrigem.acumulado);
}

function mesesEntre(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

/**
 * Apply correction and interest using combination-by-date regime
 */
export function aplicarCorrecaoPorData(
  competencia: string,
  valor: number,
  config: CorrecaoPorDataConfig,
  indicesDB: IndiceDB[] = [],
): CorrecaoResultado {
  if (valor === 0) {
    return {
      competencia,
      valor_original: valor,
      valor_corrigido: 0,
      juros: 0,
      valor_final: 0,
      fator_correcao: 1,
      taxa_juros_total: 0,
      regimes_aplicados: [],
    };
  }

  const compDate = competencia.length === 7 ? competencia + '-01' : competencia;
  const liqDate = config.data_liquidacao;
  const regimes_aplicados: CorrecaoResultado['regimes_aplicados'] = [];

  // ─── STEP 1: Build correction segments ───
  // Split the period [competencia → liquidação] into segments by regime change
  const breakpoints = new Set<string>();
  breakpoints.add(compDate);
  breakpoints.add(liqDate);

  for (const ci of config.combinacoes_indice) {
    if (ci.de && ci.de > compDate && ci.de <= liqDate) breakpoints.add(ci.de);
  }
  for (const cj of config.combinacoes_juros) {
    if (cj.de && cj.de > compDate && cj.de <= liqDate) breakpoints.add(cj.de);
  }

  const datas = Array.from(breakpoints).sort();

  // Calculate correction factor by multiplying each segment's factor
  let fatorTotal = new Decimal(1);
  for (let i = 0; i < datas.length - 1; i++) {
    const segInicio = datas[i];
    const segFim = datas[i + 1];
    const regime = getRegimeParaData(config.combinacoes_indice, segInicio);
    const indice = regime?.indice || 'SEM_CORRECAO';

    if (indice === 'SELIC') {
      // SELIC already includes interest — handle separately
      const fator = calcularFatorCorrecao('SELIC', segInicio, segFim, indicesDB);
      fatorTotal = fatorTotal.times(fator);
      regimes_aplicados.push({ tipo: 'correcao', indice: 'SELIC (correção + juros)', de: segInicio, ate: segFim, fator });
    } else {
      const fator = calcularFatorCorrecao(indice, segInicio, segFim, indicesDB);
      fatorTotal = fatorTotal.times(fator);
      regimes_aplicados.push({ tipo: 'correcao', indice, de: segInicio, ate: segFim, fator });
    }
  }

  const valorCorrigido = new Decimal(valor).times(fatorTotal);

  // ─── STEP 2: Calculate interest ───
  // Only apply interest when the index is NOT SELIC (SELIC engulfs interest)
  let jurosTotal = new Decimal(0);

  for (let i = 0; i < datas.length - 1; i++) {
    const segInicio = datas[i];
    const segFim = datas[i + 1];
    const regimeIndice = getRegimeParaData(config.combinacoes_indice, segInicio);
    const regimeJuros = getRegimeParaData(config.combinacoes_juros, segInicio);

    // Skip interest if SELIC (already included in correction)
    if (regimeIndice?.indice === 'SELIC') continue;

    // Skip if no interest regime or NENHUM
    if (!regimeJuros || regimeJuros.tipo === 'NENHUM') continue;

    if (regimeJuros.tipo === 'SELIC') {
      // SELIC as interest: use SELIC factor for this segment
      const fatorSelic = calcularFatorCorrecao('SELIC', segInicio, segFim, indicesDB);
      const jurosSegmento = valorCorrigido.times(fatorSelic - 1);
      jurosTotal = jurosTotal.plus(jurosSegmento);
      regimes_aplicados.push({ tipo: 'juros', indice: 'SELIC', de: segInicio, ate: segFim, fator: fatorSelic });
    } else if (regimeJuros.tipo === 'TAXA_LEGAL') {
      const fatorTL = calcularFatorCorrecao('TAXA_LEGAL', segInicio, segFim, indicesDB);
      const jurosSegmento = valorCorrigido.times(fatorTL - 1);
      jurosTotal = jurosTotal.plus(jurosSegmento);
      regimes_aplicados.push({ tipo: 'juros', indice: 'TAXA_LEGAL', de: segInicio, ate: segFim, fator: fatorTL });
    } else {
      // Simple monthly interest (e.g. TRD_SIMPLES 1% a.m.)
      const meses = mesesEntre(segInicio, segFim);
      const taxa = (regimeJuros.percentual || 1) / 100;
      const jurosSegmento = valorCorrigido.times(taxa).times(meses);
      jurosTotal = jurosTotal.plus(jurosSegmento);
      regimes_aplicados.push({ tipo: 'juros', indice: regimeJuros.tipo, de: segInicio, ate: segFim, fator: 1 + taxa * meses });
    }
  }

  const valorFinal = valorCorrigido.plus(jurosTotal);

  // Apply rounding
  const round = (v: Decimal) => {
    if (config.arredondamento === 'por_linha') return v.toDP(2).toNumber();
    return v.toNumber(); // defer rounding
  };

  return {
    competencia,
    valor_original: valor,
    valor_corrigido: round(valorCorrigido),
    juros: round(jurosTotal),
    valor_final: round(valorFinal),
    fator_correcao: fatorTotal.toDP(8).toNumber(),
    taxa_juros_total: jurosTotal.div(Math.max(valorCorrigido.toNumber(), 0.01)).times(100).toDP(4).toNumber(),
    regimes_aplicados,
  };
}
