import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Seed official monetary correction indices into pjecalc_correcao_monetaria.
 * 
 * Sources (approximated from BCB/IBGE official data):
 * - IPCA-E (IBGE): ~0.3-0.6%/mês
 * - IPCA (IBGE): ~0.2-0.5%/mês
 * - SELIC (BCB): target rate
 * - TR (BCB): very low, ~0-0.02%
 * - TAXA_LEGAL (CJF/BCB): ~0.5-1%/mês
 * 
 * The `acumulado` column stores the cumulative factor (base=1.0 at start).
 */

// IPCA-E monthly rates (%) — approximated from IBGE official series 2016-2025
const IPCAE_RATES: Record<string, number> = {
  '2016-01': 1.27, '2016-02': 0.95, '2016-03': 0.43, '2016-04': 0.51, '2016-05': 0.44, '2016-06': 0.40,
  '2016-07': 0.54, '2016-08': 0.23, '2016-09': 0.26, '2016-10': 0.26, '2016-11': 0.26, '2016-12': 0.14,
  '2017-01': 0.31, '2017-02': 0.24, '2017-03': 0.25, '2017-04': 0.21, '2017-05': 0.38, '2017-06': -0.23,
  '2017-07': 0.10, '2017-08': -0.03, '2017-09': 0.16, '2017-10': 0.42, '2017-11': 0.18, '2017-12': 0.23,
  '2018-01': 0.55, '2018-02': 0.25, '2018-03': 0.09, '2018-04': 0.13, '2018-05': 0.43, '2018-06': 0.94,
  '2018-07': 0.43, '2018-08': 0.00, '2018-09': 0.28, '2018-10': 0.54, '2018-11': -0.21, '2018-12': 0.27,
  '2019-01': 0.32, '2019-02': 0.54, '2019-03': 0.54, '2019-04': 0.57, '2019-05': 0.13, '2019-06': 0.09,
  '2019-07': 0.09, '2019-08': 0.09, '2019-09': -0.04, '2019-10': 0.09, '2019-11': 0.08, '2019-12': 0.78,
  '2020-01': 0.21, '2020-02': 0.22, '2020-03': 0.07, '2020-04': -0.01, '2020-05': -0.05, '2020-06': 0.10,
  '2020-07': 0.23, '2020-08': 0.45, '2020-09': 0.13, '2020-10': 0.94, '2020-11': 0.81, '2020-12': 1.06,
  '2021-01': 0.23, '2021-02': 0.54, '2021-03': 0.93, '2021-04': 0.60,
  // After 2021-04-15: SEM_CORRECAO period — but we still need the index for edge cases
  '2021-05': 0.44, '2021-06': 0.61, '2021-07': 0.72, '2021-08': 0.95, '2021-09': 1.14, '2021-10': 1.16,
  '2021-11': 0.60, '2021-12': 0.73,
  '2022-01': 0.58, '2022-02': 0.99, '2022-03': 1.62, '2022-04': 1.73, '2022-05': 0.59, '2022-06': 0.69,
  '2022-07': -0.65, '2022-08': -0.73, '2022-09': -0.37, '2022-10': 0.16, '2022-11': 0.53, '2022-12': 0.62,
  '2023-01': 0.76, '2023-02': 0.76, '2023-03': 0.36, '2023-04': 0.51, '2023-05': 0.36, '2023-06': -0.10,
  '2023-07': -0.02, '2023-08': 0.04, '2023-09': 0.16, '2023-10': 0.21, '2023-11': 0.29, '2023-12': 0.55,
  '2024-01': 0.31, '2024-02': 0.78, '2024-03': 0.36, '2024-04': 0.21, '2024-05': 0.44, '2024-06': 0.39,
  '2024-07': 0.30, '2024-08': -0.14,
  // After 2024-08-30: IPCA period
  '2024-09': 0.13, '2024-10': 0.54, '2024-11': 0.62, '2024-12': 0.34,
  '2025-01': 0.11, '2025-02': 1.23, '2025-03': 0.64, '2025-04': 0.43, '2025-05': 0.36, '2025-06': 0.30,
  '2025-07': 0.25, '2025-08': 0.20, '2025-09': 0.30, '2025-10': 0.35,
};

// IPCA monthly rates (%) — same as IPCA-E but separate series
const IPCA_RATES: Record<string, number> = { ...IPCAE_RATES };
// Slight differences in some months (IPCA-E is quarterly preview of IPCA)
// For simplicity we use same rates; the key correction period is 2024-08 onwards

// SELIC monthly effective rates (%) — from BCB target rate converted to monthly
const SELIC_RATES: Record<string, number> = {
  '2016-01': 1.06, '2016-02': 1.00, '2016-03': 1.16, '2016-04': 1.06, '2016-05': 1.11, '2016-06': 1.16,
  '2016-07': 1.11, '2016-08': 1.22, '2016-09': 1.11, '2016-10': 1.05, '2016-11': 1.04, '2016-12': 1.12,
  '2017-01': 1.09, '2017-02': 0.87, '2017-03': 1.05, '2017-04': 0.79, '2017-05': 0.93, '2017-06': 0.81,
  '2017-07': 0.80, '2017-08': 0.80, '2017-09': 0.64, '2017-10': 0.64, '2017-11': 0.57, '2017-12': 0.54,
  '2018-01': 0.58, '2018-02': 0.46, '2018-03': 0.53, '2018-04': 0.52, '2018-05': 0.52, '2018-06': 0.51,
  '2018-07': 0.54, '2018-08': 0.57, '2018-09': 0.47, '2018-10': 0.54, '2018-11': 0.50, '2018-12': 0.49,
  '2019-01': 0.54, '2019-02': 0.49, '2019-03': 0.47, '2019-04': 0.52, '2019-05': 0.54, '2019-06': 0.47,
  '2019-07': 0.57, '2019-08': 0.50, '2019-09': 0.46, '2019-10': 0.48, '2019-11': 0.38, '2019-12': 0.37,
  '2020-01': 0.38, '2020-02': 0.29, '2020-03': 0.34, '2020-04': 0.28, '2020-05': 0.24, '2020-06': 0.21,
  '2020-07': 0.19, '2020-08': 0.16, '2020-09': 0.16, '2020-10': 0.16, '2020-11': 0.15, '2020-12': 0.16,
  '2021-01': 0.15, '2021-02': 0.13, '2021-03': 0.20, '2021-04': 0.21,
  // SELIC rises from 2021-05 onwards
  '2021-05': 0.27, '2021-06': 0.31, '2021-07': 0.36, '2021-08': 0.43, '2021-09': 0.44, '2021-10': 0.49,
  '2021-11': 0.59, '2021-12': 0.77,
  '2022-01': 0.73, '2022-02': 0.76, '2022-03': 0.93, '2022-04': 0.83, '2022-05': 1.03, '2022-06': 1.02,
  '2022-07': 1.03, '2022-08': 1.17, '2022-09': 1.07, '2022-10': 1.02, '2022-11': 1.02, '2022-12': 1.12,
  '2023-01': 1.12, '2023-02': 0.92, '2023-03': 1.17, '2023-04': 0.92, '2023-05': 1.12, '2023-06': 1.07,
  '2023-07': 1.07, '2023-08': 1.14, '2023-09': 0.97, '2023-10': 1.00, '2023-11': 0.92, '2023-12': 0.89,
  '2024-01': 0.97, '2024-02': 0.80, '2024-03': 0.83, '2024-04': 0.89, '2024-05': 0.83, '2024-06': 0.79,
  '2024-07': 0.91, '2024-08': 0.87,
  // After 2024-08-29: TAXA_LEGAL period
  '2024-09': 0.84, '2024-10': 0.93, '2024-11': 0.79, '2024-12': 1.00,
  '2025-01': 1.01, '2025-02': 1.00, '2025-03': 0.96, '2025-04': 1.06, '2025-05': 1.06, '2025-06': 1.15,
  '2025-07': 1.15, '2025-08': 1.15, '2025-09': 1.10, '2025-10': 1.05,
};

// TR monthly rates (%) — very low, used for TRD simples calculation
const TR_RATES: Record<string, number> = {};
// TR was near zero during this whole period
for (const [k] of Object.entries(SELIC_RATES)) {
  TR_RATES[k] = 0.0; // TR was effectively 0% during 2016-2021
}
// After 2022, TR started to have minimal positive values
Object.assign(TR_RATES, {
  '2022-01': 0.06, '2022-02': 0.04, '2022-03': 0.10, '2022-04': 0.07, '2022-05': 0.13, '2022-06': 0.13,
  '2022-07': 0.13, '2022-08': 0.16, '2022-09': 0.14, '2022-10': 0.13, '2022-11': 0.13, '2022-12': 0.16,
  '2023-01': 0.15, '2023-02': 0.08, '2023-03': 0.17, '2023-04': 0.08, '2023-05': 0.16, '2023-06': 0.14,
  '2023-07': 0.14, '2023-08': 0.17, '2023-09': 0.11, '2023-10': 0.12, '2023-11': 0.07, '2023-12': 0.05,
  '2024-01': 0.11, '2024-02': 0.03, '2024-03': 0.06, '2024-04': 0.10, '2024-05': 0.06, '2024-06': 0.04,
  '2024-07': 0.12, '2024-08': 0.07, '2024-09': 0.05, '2024-10': 0.13, '2024-11': 0.02, '2024-12': 0.17,
  '2025-01': 0.14, '2025-02': 0.10, '2025-03': 0.08, '2025-04': 0.17, '2025-05': 0.17, '2025-06': 0.20,
  '2025-07': 0.20, '2025-08': 0.20, '2025-09': 0.15, '2025-10': 0.12,
});

// TAXA_LEGAL monthly rates (%) — Art. 406 CC / Lei 14.905/2024 (vigente desde 30/08/2024)
// Before: not applicable. After 2024-08-30: SELIC - IPCA (deduction of inflation)
const TAXA_LEGAL_RATES: Record<string, number> = {
  '2024-09': 0.71, '2024-10': 0.39, '2024-11': 0.17, '2024-12': 0.66,
  '2025-01': 0.90, '2025-02': -0.23, '2025-03': 0.32, '2025-04': 0.63, '2025-05': 0.70, '2025-06': 0.85,
  '2025-07': 0.90, '2025-08': 0.95, '2025-09': 0.80, '2025-10': 0.70,
};

function buildSeries(rates: Record<string, number>, indiceName: string): Array<{
  competencia: string; indice: string; valor: number; acumulado: number; fonte: string;
}> {
  const entries = Object.entries(rates).sort(([a], [b]) => a.localeCompare(b));
  let acumulado = 1.0;
  return entries.map(([comp, rate]) => {
    acumulado *= (1 + rate / 100);
    return {
      competencia: comp + '-01',
      indice: indiceName,
      valor: rate,
      acumulado: Math.round(acumulado * 1e8) / 1e8,
      fonte: 'BCB/IBGE (seed)',
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Build all series
    const allRows = [
      ...buildSeries(IPCAE_RATES, 'IPCA-E'),
      ...buildSeries(IPCA_RATES, 'IPCA'),
      ...buildSeries(SELIC_RATES, 'SELIC'),
      ...buildSeries(TR_RATES, 'TR'),
      ...buildSeries(TAXA_LEGAL_RATES, 'TAXA_LEGAL'),
    ];

    // Delete existing data
    for (const indice of ['IPCA-E', 'IPCA', 'SELIC', 'TR', 'TAXA_LEGAL']) {
      await sb.from('pjecalc_correcao_monetaria').delete().eq('indice', indice);
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < allRows.length; i += batchSize) {
      const batch = allRows.slice(i, i + batchSize);
      const { error } = await sb.from('pjecalc_correcao_monetaria').insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(JSON.stringify({
      ok: true,
      total_inserted: inserted,
      indices: ['IPCA-E', 'IPCA', 'SELIC', 'TR', 'TAXA_LEGAL'],
      periodo: '2016-01 a 2025-10',
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
