/**
 * sync-indices-automatico — Edge Function
 *
 * Comprehensive automatic sync of monetary correction indices from BCB/IBGE APIs.
 * Covers all major indices used in Brazilian labor law calculations.
 *
 * BCB Open Data API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados?formato=json
 *
 * Series codes:
 *   - IPCA: 433
 *   - IPCA-E: 10764
 *   - INPC: 188
 *   - IGP-M: 189
 *   - IGP-DI: 190
 *   - SELIC (monthly): 4390
 *   - TR: 226
 *   - Poupanca: 25
 *
 * Called by:
 *   - pg_cron schedule (daily at 06:00 BRT)
 *   - Manual trigger from admin UI via auto-sync-service
 *
 * Returns JSON: { ok: boolean, run_id: string, summary: SyncSummary, results: Record<string, SerieResult> }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BCB_API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// All BCB series we track
const SERIES_CONFIG: Array<{
  serieId: number;
  indice: string;
  fonte: string;
  descricao: string;
  tabela_destino: "pjecalc_correcao_monetaria" | "indices_oficiais";
}> = [
  {
    serieId: 433,
    indice: "IPCA",
    fonte: "IBGE",
    descricao: "IPCA - Indice Nacional de Precos ao Consumidor Amplo",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 10764,
    indice: "IPCA-E",
    fonte: "IBGE",
    descricao: "IPCA-E - IPCA Especial",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 188,
    indice: "INPC",
    fonte: "IBGE",
    descricao: "INPC - Indice Nacional de Precos ao Consumidor",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 189,
    indice: "IGP-M",
    fonte: "FGV",
    descricao: "IGP-M - Indice Geral de Precos do Mercado",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 190,
    indice: "IGP-DI",
    fonte: "FGV",
    descricao: "IGP-DI - Indice Geral de Precos Disponibilidade Interna",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 4390,
    indice: "SELIC",
    fonte: "BCB",
    descricao: "SELIC - Taxa efetiva mensal",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 226,
    indice: "TR",
    fonte: "BCB",
    descricao: "TR - Taxa Referencial mensal",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
  {
    serieId: 25,
    indice: "POUPANCA",
    fonte: "BCB",
    descricao: "Poupanca - Rendimento mensal",
    tabela_destino: "pjecalc_correcao_monetaria",
  },
];

interface BcbPoint {
  data: string; // dd/MM/yyyy
  valor: string;
}

interface SerieResult {
  indice: string;
  fonte: string;
  inserted: number;
  skipped: number;
  last_competencia: string | null;
  error?: string;
}

interface SyncSummary {
  total_series: number;
  series_ok: number;
  series_error: number;
  total_inserted: number;
  duration_ms: number;
}

// --- Date helpers ---

function bcbDateToCompetencia(d: string): string {
  const [_day, month, year] = d.split("/");
  return `${year}-${month}-01`;
}

function isoToMinBcb(iso: string): string {
  const [y, m] = iso.split("-");
  return `01/${m}/${y}`;
}

function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function twoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentCompetencia(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// --- BCB API fetch with retry ---

async function fetchSeriesFromBCB(
  serieId: number,
  fromDate: string,
  retries = 2
): Promise<BcbPoint[]> {
  const url = `${BCB_API}.${serieId}/dados?formato=json&dataInicial=${isoToMinBcb(fromDate)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      // 404 com "Value(s) not found" = série existe mas não tem dados no
      // intervalo solicitado (ex: IPCA-E de abril antes do IBGE publicar).
      // Tratamos como "nada novo" — não é erro fatal, retorna vazio.
      if (resp.status === 404) {
        const text = await resp.text();
        if (text.includes('not found') || text.includes('SGSNegocioException')) {
          console.info(
            `[sync-auto] BCB ${serieId}: sem dados novos a partir de ${fromDate} (404 esperado).`
          );
          return [];
        }
        // Outros 404 (ex: série inexistente) ainda são erro
        throw new Error(
          `BCB API serie ${serieId} returned 404 (série pode estar deprecada): ${text.slice(0, 200)}`
        );
      }

      if (!resp.ok) {
        const text = await resp.text();
        // Só faz retry pra 5xx ou timeouts. 4xx (exceto 404 acima) é erro do
        // request — retry não vai resolver.
        const isTransient = resp.status >= 500 || resp.status === 429;
        if (isTransient && attempt < retries) {
          console.warn(
            `[sync-auto] BCB ${serieId} attempt ${attempt + 1} failed: ${resp.status}. Retrying...`
          );
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(
          `BCB API serie ${serieId} returned ${resp.status}: ${text.slice(0, 200)}`
        );
      }

      const data = await resp.json();
      if (!Array.isArray(data)) {
        throw new Error(
          `BCB API serie ${serieId} returned non-array: ${String(data).slice(0, 100)}`
        );
      }
      return data as BcbPoint[];
    } catch (err) {
      // Network errors / timeouts merecem retry
      if (attempt < retries) {
        console.warn(
          `[sync-auto] BCB ${serieId} attempt ${attempt + 1} error: ${err}. Retrying...`
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return [];
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  // Allow filtering specific series
  const serieFilter: number[] | null = body.serie_ids || null;
  // Force full re-sync from N years back
  const forceFromYears: number | null = body.force_from_years || null;

  const results: Record<string, SerieResult> = {};
  let seriesOk = 0;
  let seriesError = 0;
  let totalInserted = 0;

  // Create a run record
  const runId = crypto.randomUUID();
  const runStartedAt = new Date().toISOString();

  for (const serie of SERIES_CONFIG) {
    if (serieFilter && !serieFilter.includes(serie.serieId)) continue;

    try {
      // Find last competencia we have for this indice
      const { data: lastRow } = await sb
        .from("pjecalc_correcao_monetaria")
        .select("competencia")
        .eq("indice", serie.indice)
        .order("competencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastComp: string =
        (lastRow as { competencia: string } | null)?.competencia || "";

      // Determine start date
      let fromDate: string;
      if (forceFromYears) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - forceFromYears);
        fromDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      } else if (lastComp) {
        fromDate = nextMonth(lastComp.slice(0, 7));
      } else {
        fromDate = twoYearsAgo();
      }

      // Skip if already up to date
      const currComp = currentCompetencia();
      if (fromDate.slice(0, 7) > currComp) {
        // Já está em dia — limpa erro antigo (idempotente)
        await sb.from("sync_status").upsert(
          {
            serie_id: serie.serieId,
            serie_nome: serie.indice,
            last_processed_date: lastComp || null,
            status: "ok",
            last_sync_attempt: new Date().toISOString(),
            error_message: null,
          },
          { onConflict: "serie_id" }
        );
        results[serie.indice] = {
          indice: serie.indice,
          fonte: serie.fonte,
          inserted: 0,
          skipped: 0,
          last_competencia: lastComp || null,
        };
        seriesOk++;
        continue;
      }

      // Fetch from BCB
      const points = await fetchSeriesFromBCB(serie.serieId, fromDate);

      if (points.length === 0) {
        // Sem dados novos (BCB 404 ou intervalo vazio) — marca OK e limpa
        // qualquer erro antigo de tentativas anteriores. Sem isso, o status
        // ficaria 'ok' mas com error_message stale aparecendo na UI.
        await sb.from("sync_status").upsert(
          {
            serie_id: serie.serieId,
            serie_nome: serie.indice,
            last_processed_date: lastComp || null,
            status: "ok",
            last_sync_attempt: new Date().toISOString(),
            error_message: null,
          },
          { onConflict: "serie_id" }
        );
        results[serie.indice] = {
          indice: serie.indice,
          fonte: serie.fonte,
          inserted: 0,
          skipped: 0,
          last_competencia: lastComp || null,
        };
        seriesOk++;
        continue;
      }

      // Parse and filter
      const rows = points
        .filter((p) => p.valor && p.valor.trim() !== "")
        .map((p) => ({
          competencia: bcbDateToCompetencia(p.data),
          indice: serie.indice,
          valor: parseFloat(p.valor.replace(",", ".")),
          fonte: serie.fonte,
        }))
        .filter(
          (r) => !isNaN(r.valor) && r.competencia >= fromDate.slice(0, 7) + "-01"
        );

      if (rows.length === 0) {
        // Pontos retornados mas todos antes do cursor — também limpa erro.
        await sb.from("sync_status").upsert(
          {
            serie_id: serie.serieId,
            serie_nome: serie.indice,
            last_processed_date: lastComp || null,
            status: "ok",
            last_sync_attempt: new Date().toISOString(),
            error_message: null,
          },
          { onConflict: "serie_id" }
        );
        results[serie.indice] = {
          indice: serie.indice,
          fonte: serie.fonte,
          inserted: 0,
          skipped: points.length,
          last_competencia: lastComp || null,
        };
        seriesOk++;
        continue;
      }

      // Upsert in chunks of 200
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb
          .from("pjecalc_correcao_monetaria")
          .upsert(chunk, {
            onConflict: "competencia,indice",
            ignoreDuplicates: false,
          });
        if (error) {
          console.error(
            `[sync-auto] upsert error ${serie.indice}:`,
            error
          );
        } else {
          inserted += chunk.length;
        }
      }

      // Recompute accumulated factors
      if (inserted > 0) {
        try {
          await sb.rpc("pjecalc_recompute_acumulado", {
            p_indice: serie.indice,
          });
        } catch (rpcErr) {
          console.warn(
            `[sync-auto] recompute_acumulado failed for ${serie.indice}:`,
            rpcErr
          );
        }
      }

      // Derive TR_FGTS = TR + 3% a.a. compound when TR is synced
      if (serie.indice === "TR" && inserted > 0) {
        const trFgtsRows = rows.map((r) => ({
          competencia: r.competencia,
          indice: "TR_FGTS",
          valor: ((1 + r.valor / 100) * 1.002466 - 1) * 100,
          fonte: "BCB/calc",
        }));
        for (let i = 0; i < trFgtsRows.length; i += 200) {
          const chunk = trFgtsRows.slice(i, i + 200);
          await sb
            .from("pjecalc_correcao_monetaria")
            .upsert(chunk, {
              onConflict: "competencia,indice",
              ignoreDuplicates: false,
            });
        }
        try {
          await sb.rpc("pjecalc_recompute_acumulado", {
            p_indice: "TR_FGTS",
          });
        } catch {}
      }

      // Also write to indices_oficiais for the generic sync_status tracking
      const oficialRows = rows.map((r) => ({
        serie_id: serie.serieId,
        data_referencia: r.competencia,
        valor: r.valor,
        ultima_atualizacao: new Date().toISOString(),
      }));
      for (let i = 0; i < oficialRows.length; i += 500) {
        const chunk = oficialRows.slice(i, i + 500);
        try {
          await sb
            .from("indices_oficiais")
            .upsert(chunk, { onConflict: "serie_id,data_referencia" });
        } catch { /* Best-effort for dual-write */ }
      }

      // Update sync_status
      const latestDate = rows[rows.length - 1].competencia;
      await sb.from("sync_status").upsert(
        {
          serie_id: serie.serieId,
          serie_nome: serie.indice,
          last_processed_date: latestDate,
          status: "completed",
          last_sync_attempt: new Date().toISOString(),
          error_message: null,
        },
        { onConflict: "serie_id" }
      );

      totalInserted += inserted;
      seriesOk++;
      results[serie.indice] = {
        indice: serie.indice,
        fonte: serie.fonte,
        inserted,
        skipped: points.length - rows.length,
        last_competencia: latestDate,
      };

      console.log(
        `[sync-auto] ${serie.indice}: inserted ${inserted} rows up to ${latestDate}`
      );

      // Small delay between series to avoid BCB rate limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync-auto] ERROR ${serie.indice}:`, msg);

      seriesError++;
      results[serie.indice] = {
        indice: serie.indice,
        fonte: serie.fonte,
        inserted: 0,
        skipped: 0,
        last_competencia: null,
        error: msg,
      };

      // Record error in sync_status
      try {
        await sb
          .from("sync_status")
          .upsert(
            {
              serie_id: serie.serieId,
              serie_nome: serie.indice,
              status: "error",
              last_sync_attempt: new Date().toISOString(),
              error_message: msg,
            },
            { onConflict: "serie_id" }
          );
      } catch { /* best-effort */ }
    }
  }

  const duration = Date.now() - startTime;

  const summary: SyncSummary = {
    total_series: seriesOk + seriesError,
    series_ok: seriesOk,
    series_error: seriesError,
    total_inserted: totalInserted,
    duration_ms: duration,
  };

  // Log the run in reference_import_runs (best-effort)
  try {
    await sb.from("reference_import_runs" as any).insert({
      id: runId,
      tipo: "sync-indices-automatico",
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
      status: seriesError === 0 ? "success" : "partial",
      summary: JSON.stringify(summary),
      details: JSON.stringify(results),
    });
  } catch (logErr) {
    console.warn("[sync-auto] Could not log run:", logErr);
  }

  console.log(
    `[sync-auto] Completed: ${summary.series_ok}/${summary.total_series} series OK, ${summary.total_inserted} inserted in ${summary.duration_ms}ms`
  );

  return new Response(
    JSON.stringify({ ok: true, run_id: runId, summary, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
