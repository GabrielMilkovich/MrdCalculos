/**
 * Tabela de índices oficiais para testes.
 * Valores acumulados baseados em séries históricas reais (IBGE/BCB).
 * 
 * IPCA-E: Acumulado base jan/2000 = 100
 * SELIC:  Acumulado base jan/2000 = 100
 * TR:     Acumulado base jan/2000 = 100
 * TAXA_LEGAL: Acumulado base jan/2000 = 100
 */

import type { PjeIndiceRow } from '@/lib/pjecalc/engine-types';

function generateMonthlyRows(
  indice: string,
  startYear: number,
  endYear: number,
  baseAccum: number,
  monthlyRateFn: (year: number, month: number) => number,
): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  let accum = baseAccum;
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const rate = monthlyRateFn(y, m);
      accum = Math.round(accum * (1 + rate) * 1e8) / 1e8;
      rows.push({
        indice,
        competencia: `${y}-${String(m).padStart(2, '0')}-01`,
        valor: Math.round(rate * 1e6) / 1e6,
        acumulado: accum,
      });
    }
  }
  return rows;
}

// IPCA-E monthly rates approximation (realistic ~0.3-0.6% monthly)
const ipcaeRates: Record<number, number[]> = {
  2015: [0.0089, 0.0118, 0.0076, 0.0071, 0.0060, 0.0069, 0.0058, 0.0028, 0.0054, 0.0068, 0.0085, 0.0096],
  2016: [0.0095, 0.0090, 0.0044, 0.0061, 0.0078, 0.0040, 0.0054, 0.0045, 0.0023, 0.0026, 0.0026, 0.0033],
  2017: [0.0038, 0.0024, 0.0025, 0.0008, 0.0020, -0.0023, 0.0010, 0.0019, 0.0016, 0.0037, 0.0018, 0.0023],
  2018: [0.0029, 0.0018, 0.0010, 0.0021, 0.0040, 0.0096, 0.0033, -0.0005, 0.0044, 0.0060, -0.0021, 0.0027],
  2019: [0.0032, 0.0045, 0.0055, 0.0057, 0.0013, -0.0004, 0.0009, 0.0011, -0.0004, 0.0009, 0.0010, 0.0089],
  2020: [0.0021, 0.0022, 0.0007, -0.0031, -0.0038, 0.0010, 0.0036, 0.0024, 0.0064, 0.0094, 0.0081, 0.0115],
  2021: [0.0025, 0.0086, 0.0093, 0.0031, 0.0044, 0.0053, 0.0096, 0.0058, 0.127, 0.0073, 0.0100, 0.0073],
  2022: [0.0058, 0.0099, 0.0118, 0.0106, 0.0059, -0.0018, -0.0068, -0.0036, -0.0029, 0.0016, 0.0053, 0.0062],
  2023: [0.0055, 0.0076, 0.0069, 0.0055, 0.0024, -0.0010, -0.0014, 0.0012, 0.0026, 0.0024, 0.0028, 0.0056],
  2024: [0.0042, 0.0078, 0.0036, 0.0037, 0.0046, 0.0039, 0.0032, -0.0002, 0.0044, 0.0054, 0.0039, 0.0052],
  2025: [0.0047, 0.0058, 0.0044, 0.0038, 0.0035, 0.0030, 0.0025, 0.0028, 0.0032, 0.0035, 0.0030, 0.0028],
};

// SELIC monthly rates approximation
const selicRates: Record<number, number[]> = {
  2015: [0.0093, 0.0082, 0.0104, 0.0095, 0.0099, 0.0107, 0.0118, 0.0111, 0.0111, 0.0111, 0.0106, 0.0116],
  2016: [0.0106, 0.0101, 0.0116, 0.0106, 0.0111, 0.0116, 0.0111, 0.0122, 0.0111, 0.0105, 0.0104, 0.0112],
  2017: [0.0109, 0.0087, 0.0105, 0.0079, 0.0093, 0.0081, 0.0080, 0.0080, 0.0064, 0.0064, 0.0057, 0.0054],
  2018: [0.0058, 0.0046, 0.0053, 0.0052, 0.0040, 0.0051, 0.0054, 0.0057, 0.0047, 0.0054, 0.0049, 0.0049],
  2019: [0.0054, 0.0049, 0.0047, 0.0052, 0.0054, 0.0047, 0.0057, 0.0050, 0.0046, 0.0048, 0.0038, 0.0037],
  2020: [0.0038, 0.0029, 0.0034, 0.0028, 0.0024, 0.0021, 0.0019, 0.0016, 0.0016, 0.0016, 0.0015, 0.0016],
  2021: [0.0015, 0.0013, 0.0020, 0.0021, 0.0027, 0.0031, 0.0036, 0.0043, 0.0044, 0.0049, 0.0059, 0.0077],
  2022: [0.0073, 0.0076, 0.0093, 0.0083, 0.0104, 0.0101, 0.0107, 0.0117, 0.0107, 0.0102, 0.0102, 0.0108],
  2023: [0.0108, 0.0092, 0.0107, 0.0092, 0.0107, 0.0107, 0.0107, 0.0114, 0.0097, 0.0100, 0.0092, 0.0089],
  2024: [0.0097, 0.0080, 0.0083, 0.0089, 0.0083, 0.0079, 0.0091, 0.0087, 0.0083, 0.0093, 0.0079, 0.0093],
  2025: [0.0106, 0.0099, 0.0106, 0.0095, 0.0090, 0.0085, 0.0080, 0.0078, 0.0075, 0.0072, 0.0070, 0.0068],
};

// TR monthly rates (very low since 2017)
const trRates: Record<number, number[]> = {
  2015: [0.0013, 0.0005, 0.0011, 0.0011, 0.0011, 0.0018, 0.0018, 0.0015, 0.0018, 0.0011, 0.0013, 0.0022],
  2016: [0.0015, 0.0010, 0.0021, 0.0017, 0.0018, 0.0022, 0.0019, 0.0022, 0.0016, 0.0015, 0.0013, 0.0014],
  2017: [0.0013, 0.0005, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2018: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2019: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2020: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2021: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  2022: [0.0, 0.0, 0.0006, 0.0005, 0.0013, 0.0014, 0.0013, 0.0019, 0.0016, 0.0012, 0.0014, 0.0016],
  2023: [0.0018, 0.0008, 0.0015, 0.0011, 0.0016, 0.0013, 0.0015, 0.0019, 0.0009, 0.0005, 0.0006, 0.0005],
  2024: [0.0008, 0.0005, 0.0006, 0.0009, 0.0007, 0.0005, 0.0008, 0.0007, 0.0004, 0.0009, 0.0005, 0.0005],
  2025: [0.0007, 0.0006, 0.0007, 0.0005, 0.0004, 0.0004, 0.0003, 0.0003, 0.0003, 0.0003, 0.0003, 0.0003],
};

function buildSeries(indice: string, rates: Record<number, number[]>): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  let accum = 100;
  const years = Object.keys(rates).map(Number).sort();
  for (const y of years) {
    const monthly = rates[y];
    for (let m = 0; m < 12; m++) {
      const rate = monthly[m];
      accum = Math.round(accum * (1 + rate) * 1e8) / 1e8;
      rows.push({
        indice,
        competencia: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        valor: rate,
        acumulado: accum,
      });
    }
  }
  return rows;
}

/** Complete IPCA-E series 2015-2025 */
export const IPCA_E_SERIES = buildSeries('IPCA-E', ipcaeRates);

/** Complete SELIC series 2015-2025 */
export const SELIC_SERIES = buildSeries('SELIC', selicRates);

/** Complete TR series 2015-2025 */
export const TR_SERIES = buildSeries('TR', trRates);

/** TAXA_LEGAL = same as SELIC for test purposes */
export const TAXA_LEGAL_SERIES = SELIC_SERIES.map(r => ({ ...r, indice: 'TAXA_LEGAL' }));

/** All indices combined - ready to pass as indicesDB to PjeCalcEngine */
export const ALL_TEST_INDICES: PjeIndiceRow[] = [
  ...IPCA_E_SERIES,
  ...SELIC_SERIES,
  ...TR_SERIES,
  ...TAXA_LEGAL_SERIES,
];
