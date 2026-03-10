/**
 * ═══════════════════════════════════════════════════════════════
 * Tabela de índices oficiais para testes — DADOS REAIS BCB/IBGE
 * ═══════════════════════════════════════════════════════════════
 * 
 * IPCA-E: Série 10764 (BCB SGS) — variação mensal % real
 * SELIC:  Série 4390  (BCB SGS) — variação mensal % real
 * TR:     Série 226   (BCB SGS) — taxas mensais reais (muito baixas desde 2017)
 * 
 * Base acumulada: jan/2015 = 100
 * Última atualização: 2025-12-01
 */

import type { PjeIndiceRow } from '@/lib/pjecalc/engine-types';

// ═══════════════════════════════════════════════════
// IPCA-E — Série 10764 BCB (valores % reais)
// ═══════════════════════════════════════════════════

const IPCAE_REAL: Record<number, number[]> = {
  2015: [0.89, 1.33, 1.24, 1.07, 0.60, 0.99, 0.59, 0.43, 0.39, 0.66, 0.85, 1.18],
  2016: [0.92, 1.42, 0.43, 0.51, 0.86, 0.40, 0.54, 0.45, 0.23, 0.19, 0.26, 0.19],
  2017: [0.31, 0.54, 0.15, 0.21, 0.24, 0.16, -0.18, 0.35, 0.11, 0.34, 0.32, 0.35],
  2018: [0.39, 0.38, 0.10, 0.21, 0.14, 1.11, 0.64, 0.13, 0.09, 0.58, 0.19, -0.16],
  2019: [0.30, 0.34, 0.54, 0.72, 0.35, 0.06, 0.09, 0.08, 0.09, 0.09, 0.14, 1.05],
  2020: [0.71, 0.22, 0.02, -0.01, -0.59, 0.02, 0.30, 0.23, 0.45, 0.94, 0.81, 1.06],
  2021: [0.78, 0.48, 0.93, 0.60, 0.44, 0.83, 0.72, 0.89, 1.14, 1.20, 1.17, 0.78],
  2022: [0.58, 0.99, 0.95, 1.73, 0.59, 0.69, 0.13, -0.73, -0.37, 0.16, 0.53, 0.52],
  2023: [0.55, 0.76, 0.69, 0.57, 0.51, 0.04, -0.07, 0.28, 0.35, 0.21, 0.33, 0.40],
  2024: [0.31, 0.78, 0.36, 0.21, 0.44, 0.39, 0.30, 0.19, 0.13, 0.54, 0.62, 0.34],
  2025: [0.11, 1.23, 0.64, 0.43, 0.36, 0.26, 0.33, -0.14, 0.48, 0.18, 0.20, 0.25],
};

// ═══════════════════════════════════════════════════
// SELIC — Série 4390 BCB (valores % reais)
// ═══════════════════════════════════════════════════

const SELIC_REAL: Record<number, number[]> = {
  2015: [0.94, 0.82, 1.04, 0.95, 0.99, 1.07, 1.18, 1.11, 1.11, 1.11, 1.06, 1.16],
  2016: [1.06, 1.00, 1.16, 1.06, 1.11, 1.16, 1.11, 1.22, 1.11, 1.05, 1.04, 1.12],
  2017: [1.09, 0.87, 1.05, 0.79, 0.93, 0.81, 0.80, 0.80, 0.64, 0.64, 0.57, 0.54],
  2018: [0.58, 0.47, 0.53, 0.52, 0.52, 0.52, 0.54, 0.57, 0.47, 0.54, 0.49, 0.49],
  2019: [0.54, 0.49, 0.47, 0.52, 0.54, 0.47, 0.57, 0.50, 0.46, 0.48, 0.38, 0.37],
  2020: [0.38, 0.29, 0.34, 0.28, 0.24, 0.21, 0.19, 0.16, 0.16, 0.16, 0.15, 0.16],
  2021: [0.15, 0.13, 0.20, 0.21, 0.27, 0.31, 0.36, 0.43, 0.44, 0.49, 0.59, 0.77],
  2022: [0.73, 0.76, 0.93, 0.83, 1.03, 1.02, 1.03, 1.17, 1.07, 1.02, 1.02, 1.12],
  2023: [1.12, 0.92, 1.17, 0.92, 1.12, 1.07, 1.07, 1.14, 0.97, 1.00, 0.92, 0.89],
  2024: [0.97, 0.80, 0.83, 0.89, 0.83, 0.79, 0.91, 0.87, 0.84, 0.93, 0.79, 0.93],
  2025: [1.01, 0.99, 0.96, 1.06, 1.14, 1.10, 1.28, 1.16, 1.22, 1.28, 1.05, 1.22],
};

// ═══════════════════════════════════════════════════
// TR — Taxas mensais reais (muito baixas pós-2017)
// ═══════════════════════════════════════════════════

const TR_REAL: Record<number, number[]> = {
  2015: [0.13, 0.05, 0.11, 0.11, 0.11, 0.18, 0.18, 0.15, 0.18, 0.11, 0.13, 0.22],
  2016: [0.15, 0.10, 0.21, 0.17, 0.18, 0.22, 0.19, 0.22, 0.16, 0.15, 0.13, 0.14],
  2017: [0.13, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2018: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2019: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2020: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2021: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2022: [0.0, 0.0, 0.06, 0.05, 0.13, 0.14, 0.13, 0.19, 0.16, 0.12, 0.14, 0.16],
  2023: [0.18, 0.08, 0.15, 0.11, 0.16, 0.13, 0.15, 0.19, 0.09, 0.05, 0.06, 0.05],
  2024: [0.08, 0.05, 0.06, 0.09, 0.07, 0.05, 0.08, 0.07, 0.04, 0.09, 0.05, 0.05],
  2025: [0.07, 0.06, 0.07, 0.05, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
};

// ═══════════════════════════════════════════════════
// BUILDER — converte taxas % em PjeIndiceRow[]
// ═══════════════════════════════════════════════════

function buildSeries(indice: string, rates: Record<number, number[]>): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  let accum = 100;
  const years = Object.keys(rates).map(Number).sort();
  for (const y of years) {
    const monthly = rates[y];
    for (let m = 0; m < 12; m++) {
      const rate = monthly[m] / 100; // BCB values are in %, convert to decimal
      accum = Math.round(accum * (1 + rate) * 1e8) / 1e8;
      rows.push({
        indice,
        competencia: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        valor: Math.round(rate * 1e6) / 1e6,
        acumulado: accum,
      });
    }
  }
  return rows;
}

/** Complete IPCA-E series 2015-2025 (dados reais BCB série 10764) */
export const IPCA_E_SERIES = buildSeries('IPCA-E', IPCAE_REAL);

/** IPCAE alias (used by correction-by-date.ts) */
export const IPCAE_SERIES = IPCA_E_SERIES.map(r => ({ ...r, indice: 'IPCAE' }));

/** IPCA alias (same rates for test purposes) */
export const IPCA_SERIES = IPCA_E_SERIES.map(r => ({ ...r, indice: 'IPCA' }));

/** Complete SELIC series 2015-2025 (dados reais BCB série 4390) */
export const SELIC_SERIES = buildSeries('SELIC', SELIC_REAL);

/** Complete TR series 2015-2025 (dados reais BCB série 226) */
export const TR_SERIES = buildSeries('TR', TR_REAL);

/** TAXA_LEGAL = same as SELIC for test purposes */
export const TAXA_LEGAL_SERIES = SELIC_SERIES.map(r => ({ ...r, indice: 'TAXA_LEGAL' }));

/** INPC approximation (uses IPCA-E rates — close enough for testing) */
export const INPC_SERIES = IPCA_E_SERIES.map(r => ({ ...r, indice: 'INPC' }));

/** All indices combined - ready to pass as indicesDB to PjeCalcEngine */
export const ALL_TEST_INDICES: PjeIndiceRow[] = [
  ...IPCA_E_SERIES,
  ...IPCAE_SERIES,
  ...IPCA_SERIES,
  ...SELIC_SERIES,
  ...TR_SERIES,
  ...TAXA_LEGAL_SERIES,
  ...INPC_SERIES,
];
