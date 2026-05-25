/**
 * sync-pjecalc-indices — Edge Function
 *
 * Fetches official monetary correction indices from BCB (SELIC, TR) and IBGE (IPCA-E, IPCA,
 * INPC) / FGV (IGP-M, IGP-DI) via BCB API and writes directly to `pjecalc_correcao_monetaria`.
 *
 * BCB Open Data series:
 *   - SELIC efetiva mensal:  4390
 *   - IPCA-E (IBGE, mensal): 10764
 *   - IPCA (IBGE, mensal):     433
 *   - INPC (IBGE, mensal):     188
 *   - IGP-M (FGV, mensal):     189
 *   - IGP-DI (FGV, mensal):    190
 *   - TR mensal:               226
 *
 * Also derives:
 *   - TR_FGTS = TR + 3%a.a. compound (FGTS JAM approximation)
 *
 * Called by:
 *   - pg_cron schedule (5th of every month at 11:00 UTC)
 *   - Manual trigger from admin UI
 *
 * Returns JSON: { ok: boolean, results: Record<string, SyncResult> }
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BCB_API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// BCB series IDs mapped to pjecalc_correcao_monetaria indice names.
// All series below publish monthly variation percentages (e.g. 0.42 = 0.42%).
const SERIES: Array<{ serieId: number; indice: string; fonte: string }> = [
  { serieId: 4390,  indice: 'SELIC',  fonte: 'BCB'  }, // SELIC efetiva mensal
  { serieId: 10764, indice: 'IPCA-E', fonte: 'IBGE' }, // IPCA-E mensal
  { serieId: 433,   indice: 'IPCA',   fonte: 'IBGE' }, // IPCA mensal
  { serieId: 188,   indice: 'INPC',   fonte: 'IBGE' }, // INPC mensal
  { serieId: 189,   indice: 'IGP-M',  fonte: 'FGV'  }, // IGP-M mensal
  { serieId: 190,   indice: 'IGP-DI', fonte: 'FGV'  }, // IGP-DI mensal
  { serieId: 226,   indice: 'TR',     fonte: 'BCB'  }, // TR mensal
];

interface BcbPoint { data: string; valor: string; }

function bcbDateToIso(d: string): string {
  const [day, month, year] = d.split('/');
  return `${year}-${month}-01`; // we want month-start for competencia
}

function isoToBcb(iso: string): string {
  const [y, m] = iso.split('-');
  return `01/${m}/${y}`;
}

async function fetchSeries(serieId: number, fromDate: string): Promise<BcbPoint[]> {
  const url = `${BCB_API}.${serieId}/dados?formato=json&dataInicial=${isoToBcb(fromDate)}`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });

  // 404 com "Value(s) not found" = série existe mas o intervalo não tem
  // dados ainda (publicação mensal pendente). Retorna vazio em vez de
  // derrubar a sync.
  if (resp.status === 404) {
    const text = await resp.text();
    if (text.includes('not found') || text.includes('SGSNegocioException')) {
      console.info(`[sync-pjecalc] BCB ${serieId}: sem dados novos (404 esperado).`);
      return [];
    }
    throw new Error(`BCB API ${serieId} returned 404 (série pode estar deprecada): ${text.slice(0, 200)}`);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`BCB API ${serieId} returned ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!Array.isArray(data)) throw new Error(`BCB API ${serieId} returned non-array: ${String(data).slice(0, 100)}`);
  return data as BcbPoint[];
}

interface SyncResult {
  indice: string;
  inserted: number;
  last_competencia: string | null;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  // Allow overriding which series to sync; default: all
  const serieFilter: number[] | null = body.serie_ids || null;

  const results: Record<string, SyncResult> = {};

  for (const serie of SERIES) {
    if (serieFilter && !serieFilter.includes(serie.serieId)) continue;

    try {
      // Find last competencia we have for this indice
      const { data: lastRow } = await sb
        .from('pjecalc_correcao_monetaria')
        .select('competencia')
        .eq('indice', serie.indice)
        .order('competencia', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Start from day after last known, or 2 years back if no data
      const lastComp: string = (lastRow as { competencia: string } | null)?.competencia || '';
      const fromDate = lastComp
        ? nextMonth(lastComp.slice(0, 7))
        : twoYearsAgo();

      // If we're already up to current month, skip
      const now = new Date();
      const currentComp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (fromDate.slice(0, 7) > currentComp) {
        results[serie.indice] = { indice: serie.indice, inserted: 0, last_competencia: lastComp || null };
        continue;
      }

      const points = await fetchSeries(serie.serieId, fromDate);
      if (points.length === 0) {
        results[serie.indice] = { indice: serie.indice, inserted: 0, last_competencia: lastComp || null };
        continue;
      }

      const rows = points
        .filter(p => p.valor && p.valor.trim() !== '')
        .map(p => ({
          competencia: bcbDateToIso(p.data),
          indice: serie.indice,
          valor: parseFloat(p.valor.replace(',', '.')),
          fonte: serie.fonte,
        }))
        .filter(r => !isNaN(r.valor) && r.competencia >= fromDate.slice(0, 7) + '-01');

      if (rows.length === 0) {
        results[serie.indice] = { indice: serie.indice, inserted: 0, last_competencia: lastComp || null };
        continue;
      }

      // Insert in chunks
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb
          .from('pjecalc_correcao_monetaria')
          .upsert(chunk, { onConflict: 'competencia,indice', ignoreDuplicates: false });
        if (error) console.error(`[sync-pjecalc-indices] upsert error ${serie.indice}:`, error);
        else inserted += chunk.length;
      }

      // Recompute acumulado for this indice using window function
      if (inserted > 0) {
        await sb.rpc('pjecalc_recompute_acumulado', { p_indice: serie.indice });
      }

      // Also sync TR_FGTS = TR + 3%a.a. compound if TR was synced
      if (serie.indice === 'TR' && inserted > 0) {
        const trFgtsRows = rows.map(r => ({
          competencia: r.competencia,
          indice: 'TR_FGTS',
          valor: ((1 + r.valor / 100) * 1.002466 - 1) * 100,
          fonte: 'BCB/calc',
        }));
        for (let i = 0; i < trFgtsRows.length; i += 200) {
          const chunk = trFgtsRows.slice(i, i + 200);
          await sb
            .from('pjecalc_correcao_monetaria')
            .upsert(chunk, { onConflict: 'competencia,indice', ignoreDuplicates: false });
        }
        await sb.rpc('pjecalc_recompute_acumulado', { p_indice: 'TR_FGTS' });
      }

      const lastSynced = rows[rows.length - 1].competencia;
      results[serie.indice] = { indice: serie.indice, inserted, last_competencia: lastSynced };
      console.log(`[sync-pjecalc-indices] ${serie.indice}: inserted ${inserted} rows up to ${lastSynced}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync-pjecalc-indices] ERROR ${serie.indice}:`, msg);
      results[serie.indice] = { indice: serie.indice, inserted: 0, last_competencia: null, error: msg };
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return next;
}

function twoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
