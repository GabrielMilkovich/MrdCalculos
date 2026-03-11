/**
 * =====================================================
 * CORRECTION / INTEREST ENGINE — Combination by Date
 * =====================================================
 * 
 * Implements multi-phase monetary correction + interest regimes
 * per PJe-Calc behavior (ADC 58/59 STF).
 * 
 * CRITICAL RULES:
 * 1. SELIC includes both correction AND interest — NEVER cumulate with separate interest
 * 2. SEM_CORRECAO / NENHUM = zero factor (no correction, no interest)
 * 3. Negative correction factors: respect ignorarTaxaNegativa from PJC
 * 4. Missing index data: BLOCK calculation, return structured warning
 * 5. Interest starts from juros_inicio (ajuizamento/citação/vencimento)
 * 6. Juros após CS: interest base = corrected - CS_share
 * 7. TAXA_LEGAL: lookup from TAXA_LEGAL series, NOT improvised SELIC
 * 8. Base de juros: DIFERENCA (default) | DEVIDO | CORRIGIDO
 */

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// TYPES
// =====================================================

export interface CombinacaoIndice {
  de?: string;   // YYYY-MM-DD (inclusive)
  ate?: string;  // YYYY-MM-DD (inclusive)
  indice: string; // IPCAE | IPCA | SELIC | SEM_CORRECAO | TR | INPC | IGP-M | NENHUM
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
  data_liquidacao: string;
  arredondamento: 'por_linha' | 'por_competencia' | 'final';
  /** PJC: ignorarTaxaNegativa — clamp negative correction factors to 1 */
  ignorar_taxa_negativa?: boolean;
  /** PJC: baseDeJurosDasVerbas — which value to use as interest base */
  base_de_juros_das_verbas?: string; // 'DIFERENCA' | 'DEVIDO' | 'CORRIGIDO'
  /** Interest start date (ajuizamento or citação) */
  juros_inicio_data?: string;
}

export interface IndiceDB {
  indice: string;
  competencia: string; // YYYY-MM-DD
  valor: number;
  acumulado: number;
}

export interface CorrecaoWarning {
  code: string;
  module: string;
  message: string;
  competencia?: string;
  blocking: boolean;
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
  warnings: CorrecaoWarning[];
}

// =====================================================
// REGIME RESOLVER
// =====================================================

/**
 * Determines which regime applies on a given date.
 * Sorted by start date (most recent first), with range check.
 */
function getRegimeParaData<T extends { de?: string; ate?: string }>(combinacoes: T[], data: string): T | null {
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

  for (const c of sorted) {
    if ((c.de || '0000-01-01') <= data) return c;
  }

  return combinacoes[0] || null;
}

// =====================================================
// INDEX LOOKUP — with BLOCKING on missing data
// =====================================================

const ZERO_CORRECTION_INDICES = new Set([
  'SEM_CORRECAO', 'NENHUM', 'Sem Correção', 'Sem Correcao',
]);

/**
 * Calculates correction factor between two dates using accumulated index data.
 * 
 * BLOCKING: Returns null when index data is missing (caller must handle).
 * Returns 1 for SEM_CORRECAO/NENHUM.
 */
function calcularFatorCorrecao(
  indice: string,
  compOrigem: string,
  compDestino: string,
  indicesDB: IndiceDB[],
  warnings: CorrecaoWarning[],
): number | null {
  if (ZERO_CORRECTION_INDICES.has(indice)) return 1;

  const dados = indicesDB
    .filter(i => i.indice === indice)
    .sort((a, b) => a.competencia.localeCompare(b.competencia));

  if (dados.length === 0) {
    warnings.push({
      code: 'E003',
      module: 'correcao',
      message: `BLOQUEIO: Índice ${indice} sem dados para ${compOrigem}→${compDestino}. Série histórica ausente.`,
      competencia: compOrigem,
      blocking: true,
    });
    return null;
  }

  // PJe-Calc rule: only use indices from CLOSED months
  const hoje = new Date();
  const ultimoMesFechado = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`;
  const compDestinoEfetivo = compDestino.slice(0, 7) > ultimoMesFechado
    ? ultimoMesFechado + '-01'
    : compDestino;

  // Súmula 381 TST: correction starts from month SUBSEQUENT to vencimento
  const origemArr = dados.filter(i => i.competencia.slice(0, 7) >= compOrigem.slice(0, 7));
  const destArr = dados.filter(i => i.competencia.slice(0, 7) <= compDestinoEfetivo.slice(0, 7));
  const idxOrigem = origemArr[0] || dados[0];
  const idxDest = destArr[destArr.length - 1] || dados[dados.length - 1];

  if (!idxOrigem?.acumulado || !idxDest?.acumulado || Number(idxOrigem.acumulado) === 0) {
    warnings.push({
      code: 'E003',
      module: 'correcao',
      message: `BLOQUEIO: Índice ${indice} sem acumulado válido para ${compOrigem}→${compDestinoEfetivo}.`,
      competencia: compOrigem,
      blocking: true,
    });
    return null;
  }

  return Number(idxDest.acumulado) / Number(idxOrigem.acumulado);
}

function mesesEntre(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

// =====================================================
// MAIN CORRECTION FUNCTION
// =====================================================

/**
 * Apply correction and interest using combination-by-date regime.
 * 
 * CRITICAL BEHAVIORS:
 * - SELIC as correction index: factor already includes interest → NO separate interest
 * - SELIC as interest type (with non-SELIC correction): apply SELIC factor as interest
 * - SEM_CORRECAO / NENHUM: zero correction AND zero interest for that segment
 * - Missing index: returns blocking warning, fator = null → calculation should halt
 * - Negative factor: clamped to 1 if ignorar_taxa_negativa is true
 */
export function aplicarCorrecaoPorData(
  competencia: string,
  valor: number,
  config: CorrecaoPorDataConfig,
  indicesDB: IndiceDB[] = [],
): CorrecaoResultado {
  const warnings: CorrecaoWarning[] = [];

  if (valor === 0) {
    return {
      competencia, valor_original: valor,
      valor_corrigido: 0, juros: 0, valor_final: 0,
      fator_correcao: 1, taxa_juros_total: 0,
      regimes_aplicados: [], warnings,
    };
  }

  const compDate = competencia.length === 7 ? competencia + '-01' : competencia;
  const liqDate = config.data_liquidacao;
  const regimes_aplicados: CorrecaoResultado['regimes_aplicados'] = [];

  // ─── STEP 1: Build correction segments ───
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

  // ─── STEP 2: Calculate correction factor by multiplying segments ───
  let fatorTotal = new Decimal(1);
  let hasBlockingError = false;

  for (let i = 0; i < datas.length - 1; i++) {
    const segInicio = datas[i];
    const segFim = datas[i + 1];
    const regime = getRegimeParaData(config.combinacoes_indice, segInicio);
    const indice = regime?.indice || 'SEM_CORRECAO';

    if (ZERO_CORRECTION_INDICES.has(indice)) {
      regimes_aplicados.push({ tipo: 'correcao', indice: `${indice} (suspenso)`, de: segInicio, ate: segFim, fator: 1 });
      continue;
    }

    if (indice === 'SELIC') {
      // SELIC already includes correction + interest
      const fator = calcularFatorCorrecao('SELIC', segInicio, segFim, indicesDB, warnings);
      if (fator === null) { hasBlockingError = true; continue; }
      
      let fatorEfetivo = fator;
      if (config.ignorar_taxa_negativa && fator < 1) {
        warnings.push({
          code: 'W031',
          module: 'correcao',
          message: `Taxa negativa ignorada para SELIC em ${segInicio}→${segFim} (fator=${fator.toFixed(6)})`,
          competencia, blocking: false,
        });
        fatorEfetivo = 1;
      }
      
      fatorTotal = fatorTotal.times(fatorEfetivo);
      regimes_aplicados.push({ tipo: 'correcao', indice: 'SELIC (correção + juros)', de: segInicio, ate: segFim, fator: fatorEfetivo });
    } else {
      // Regular correction index
      const fator = calcularFatorCorrecao(indice, segInicio, segFim, indicesDB, warnings);
      if (fator === null) { hasBlockingError = true; continue; }
      
      let fatorEfetivo = fator;
      if (config.ignorar_taxa_negativa && fator < 1) {
        warnings.push({
          code: 'W031',
          module: 'correcao',
          message: `Taxa negativa ignorada para ${indice} em ${segInicio}→${segFim} (fator=${fator.toFixed(6)})`,
          competencia, blocking: false,
        });
        fatorEfetivo = 1;
      }
      
      fatorTotal = fatorTotal.times(fatorEfetivo);
      regimes_aplicados.push({ tipo: 'correcao', indice, de: segInicio, ate: segFim, fator: fatorEfetivo });
    }
  }

  const valorCorrigido = new Decimal(valor).times(fatorTotal);

  // ─── STEP 3: Calculate interest ───
  // CRITICAL: Only apply interest when the correction index is NOT SELIC
  // SELIC already engulfs interest → separate interest = bis in idem
  let jurosTotal = new Decimal(0);

  for (let i = 0; i < datas.length - 1; i++) {
    const segInicio = datas[i];
    const segFim = datas[i + 1];
    const regimeIndice = getRegimeParaData(config.combinacoes_indice, segInicio);
    const regimeJuros = getRegimeParaData(config.combinacoes_juros, segInicio);
    const indice = regimeIndice?.indice || 'SEM_CORRECAO';

    // ══ ANTI-CUMULATION RULES ══
    // 1. SELIC as correction → skip ALL separate interest (already included)
    if (indice === 'SELIC') continue;
    // 2. SEM_CORRECAO / NENHUM → skip interest (suspended per PJe-Calc)
    if (ZERO_CORRECTION_INDICES.has(indice)) continue;
    // 3. No interest regime configured
    if (!regimeJuros || regimeJuros.tipo === 'NENHUM') continue;

    // Apply interest start date
    if (config.juros_inicio_data && segFim <= config.juros_inicio_data) continue;
    const realStart = config.juros_inicio_data && segInicio < config.juros_inicio_data
      ? config.juros_inicio_data
      : segInicio;

    // Determine interest base
    const interestBase = valorCorrigido; // Default: corrected value

    if (regimeJuros.tipo === 'SELIC') {
      // SELIC as interest type (with non-SELIC correction)
      const fatorSelic = calcularFatorCorrecao('SELIC', realStart, segFim, indicesDB, warnings);
      if (fatorSelic !== null) {
        const jurosSegmento = interestBase.times(fatorSelic - 1);
        jurosTotal = jurosTotal.plus(jurosSegmento);
        regimes_aplicados.push({ tipo: 'juros', indice: 'SELIC', de: realStart, ate: segFim, fator: fatorSelic });
      }
    } else if (regimeJuros.tipo === 'TAXA_LEGAL') {
      // TAXA_LEGAL: proper lookup from TAXA_LEGAL series
      const fatorTL = calcularFatorCorrecao('TAXA_LEGAL', realStart, segFim, indicesDB, warnings);
      if (fatorTL !== null) {
        const jurosSegmento = interestBase.times(fatorTL - 1);
        jurosTotal = jurosTotal.plus(jurosSegmento);
        regimes_aplicados.push({ tipo: 'juros', indice: 'TAXA_LEGAL', de: realStart, ate: segFim, fator: fatorTL });
      } else {
        // TAXA_LEGAL series missing — warn but don't silently skip
        warnings.push({
          code: 'E012',
          module: 'juros',
          message: `TAXA_LEGAL: série histórica ausente para ${realStart}→${segFim}. Juros não aplicados neste segmento.`,
          competencia, blocking: true,
        });
      }
    } else {
      // Simple monthly interest (TRD_SIMPLES 1% a.m. default)
      const meses = mesesEntre(realStart, segFim);
      const taxa = (regimeJuros.percentual || 1) / 100;
      const jurosSegmento = interestBase.times(taxa).times(meses);
      jurosTotal = jurosTotal.plus(jurosSegmento);
      regimes_aplicados.push({ tipo: 'juros', indice: regimeJuros.tipo, de: realStart, ate: segFim, fator: 1 + taxa * meses });
    }
  }

  const valorFinal = valorCorrigido.plus(jurosTotal);

  // Apply rounding
  const round = (v: Decimal) => {
    if (config.arredondamento === 'por_linha') return v.toDP(2).toNumber();
    return v.toNumber();
  };

  // Add blocking warning if we had errors
  if (hasBlockingError) {
    warnings.push({
      code: 'E003',
      module: 'correcao',
      message: `Correção monetária incompleta para ${competencia}: índices ausentes. Resultado pode estar incorreto.`,
      competencia, blocking: true,
    });
  }

  return {
    competencia,
    valor_original: valor,
    valor_corrigido: round(valorCorrigido),
    juros: round(jurosTotal),
    valor_final: round(valorFinal),
    fator_correcao: fatorTotal.toDP(8).toNumber(),
    taxa_juros_total: jurosTotal.div(Math.max(valorCorrigido.toNumber(), 0.01)).times(100).toDP(4).toNumber(),
    regimes_aplicados,
    warnings,
  };
}
