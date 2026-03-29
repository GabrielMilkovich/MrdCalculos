/**
 * =====================================================
 * AUTO-SYNC SERVICE — Client-side index sync orchestrator
 * =====================================================
 *
 * Manages automatic synchronization of monetary correction indices:
 * 1. Checks last sync date from database
 * 2. Triggers the sync-indices-automatico Edge Function if stale (>24h)
 * 3. Provides status for UI badge (up-to-date, stale, syncing, error)
 * 4. Allows manual trigger
 */

import { supabase } from "@/integrations/supabase/client";

// --- Types ---

export type AutoSyncStatus = "loading" | "up_to_date" | "stale" | "syncing" | "error";

export interface AutoSyncState {
  status: AutoSyncStatus;
  lastSyncAt: string | null;
  lastRunId: string | null;
  seriesSummary: {
    total: number;
    ok: number;
    error: number;
    totalInserted: number;
  } | null;
  errorMessage: string | null;
}

export interface SyncRunResult {
  ok: boolean;
  run_id: string;
  summary: {
    total_series: number;
    series_ok: number;
    series_error: number;
    total_inserted: number;
    duration_ms: number;
  };
  results: Record<
    string,
    {
      indice: string;
      fonte: string;
      inserted: number;
      skipped: number;
      last_competencia: string | null;
      error?: string;
    }
  >;
}

// All series IDs tracked by the automatic sync
const ALL_SERIES_IDS = [433, 10764, 188, 189, 190, 4390, 226, 25];

// Staleness threshold: 24 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// --- Service Functions ---

/**
 * Check the current sync status by querying sync_status table.
 * Returns the aggregate state across all tracked series.
 */
export async function checkSyncStatus(): Promise<AutoSyncState> {
  try {
    const { data, error } = await supabase
      .from("sync_status" as any)
      .select("*")
      .in("serie_id", ALL_SERIES_IDS);

    // If the sync_status table doesn't exist or query fails, return up_to_date
    // to prevent infinite retry loops. Sync is optional functionality.
    if (error) {
      console.warn('[AutoSync] sync_status query failed (table may not exist):', error.message);
      return {
        status: "up_to_date",
        lastSyncAt: null,
        lastRunId: null,
        seriesSummary: null,
        errorMessage: null,
      };
    }

    const rows = (data as any[]) || [];

    if (rows.length === 0) {
      // No sync records — treat as up_to_date to avoid triggering auto-sync
      // when the infrastructure isn't set up yet
      return {
        status: "up_to_date",
        lastSyncAt: null,
        lastRunId: null,
        seriesSummary: null,
        errorMessage: "Tabela sync_status vazia. Use o botao manual para sincronizar.",
      };
    }

    const hasErrors = rows.some((r: any) => r.status === "error");
    const lastSyncDates = rows
      .map((r: any) => r.last_sync_attempt)
      .filter(Boolean)
      .sort();
    const lastSyncAt = lastSyncDates.length > 0 ? lastSyncDates[lastSyncDates.length - 1] : null;

    // Check if any series is stale (last sync > 24h ago)
    const now = Date.now();
    const isStale = rows.some((r: any) => {
      if (!r.last_sync_attempt) return true;
      const syncTime = new Date(r.last_sync_attempt).getTime();
      return now - syncTime > STALE_THRESHOLD_MS;
    });

    // Check if any series never had data
    const hasMissing = rows.length < ALL_SERIES_IDS.length;

    const okCount = rows.filter((r: any) => r.status === "completed").length;
    const errorCount = rows.filter((r: any) => r.status === "error").length;

    let status: AutoSyncStatus;
    if (hasErrors && okCount === 0) {
      status = "error";
    } else if (isStale || hasMissing) {
      status = "stale";
    } else {
      status = "up_to_date";
    }

    const errorMsg = hasErrors
      ? rows.find((r: any) => r.status === "error")?.error_message || "Falha na sincronizacao"
      : null;

    return {
      status,
      lastSyncAt,
      lastRunId: null,
      seriesSummary: {
        total: rows.length,
        ok: okCount,
        error: errorCount,
        totalInserted: 0,
      },
      errorMessage: errorMsg,
    };
  } catch (err) {
    return {
      status: "error",
      lastSyncAt: null,
      lastRunId: null,
      seriesSummary: null,
      errorMessage: err instanceof Error ? err.message : "Erro ao verificar status de sync",
    };
  }
}

/**
 * Trigger the automatic sync Edge Function.
 * Can optionally filter to specific series IDs.
 */
export async function triggerAutoSync(
  options?: { serieIds?: number[]; forceFromYears?: number }
): Promise<SyncRunResult> {
  const body: Record<string, any> = {};
  if (options?.serieIds) body.serie_ids = options.serieIds;
  if (options?.forceFromYears) body.force_from_years = options.forceFromYears;

  const { data, error } = await supabase.functions.invoke(
    "sync-indices-automatico",
    { body }
  );

  if (error) {
    throw new Error(`Falha ao acionar sincronizacao: ${error.message}`);
  }

  return data as SyncRunResult;
}

/**
 * Check if sync is needed (stale) and auto-trigger if so.
 * Returns the result of the check or the sync run.
 */
export async function checkAndAutoSync(): Promise<{
  wasTriggered: boolean;
  state: AutoSyncState;
  runResult?: SyncRunResult;
}> {
  const state = await checkSyncStatus();

  if (state.status === "stale") {
    try {
      const runResult = await triggerAutoSync();
      const newState = await checkSyncStatus();
      return {
        wasTriggered: true,
        state: {
          ...newState,
          lastRunId: runResult.run_id,
          seriesSummary: {
            total: runResult.summary.total_series,
            ok: runResult.summary.series_ok,
            error: runResult.summary.series_error,
            totalInserted: runResult.summary.total_inserted,
          },
        },
        runResult,
      };
    } catch {
      return { wasTriggered: false, state };
    }
  }

  return { wasTriggered: false, state };
}

/**
 * Get detailed series status for display.
 */
export async function getDetailedSeriesStatus(): Promise<
  Array<{
    serieId: number;
    nome: string;
    status: string;
    lastProcessedDate: string | null;
    lastSyncAttempt: string | null;
    errorMessage: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("sync_status" as any)
    .select("*")
    .in("serie_id", ALL_SERIES_IDS);

  if (error) {
    console.warn('[AutoSync] Failed to load series detail:', error.message);
    return [];
  }

  const rows = (data as any[]) || [];

  const seriesNames: Record<number, string> = {
    433: "IPCA",
    10764: "IPCA-E",
    188: "INPC",
    189: "IGP-M",
    190: "IGP-DI",
    4390: "SELIC",
    226: "TR",
    25: "Poupanca",
  };

  return ALL_SERIES_IDS.map((id) => {
    const row = rows.find((r: any) => r.serie_id === id);
    return {
      serieId: id,
      nome: seriesNames[id] || `Serie ${id}`,
      status: row?.status || "pending",
      lastProcessedDate: row?.last_processed_date || null,
      lastSyncAttempt: row?.last_sync_attempt || null,
      errorMessage: row?.error_message || null,
    };
  });
}
