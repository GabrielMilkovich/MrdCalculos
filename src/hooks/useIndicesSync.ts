import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncState {
  status: "loading" | "ok" | "error" | "stale";
  lastSync: string | null;
  error: string | null;
}

// Linha da view/tabela sync_status (não tipada em supabase.ts)
interface SyncStatusRow {
  serie_id: number;
  status?: string | null;
  last_sync_attempt?: string | null;
  last_processed_date?: string | null;
  error_message?: string | null;
}

// Resultado por série retornado pela edge function sync-indices
interface SyncIndicesResult {
  inserted?: number;
  error?: string | null;
}

export function useIndicesSync() {
  const [state, setState] = useState<SyncState>({
    status: "loading",
    lastSync: null,
    error: null,
  });
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      // sync_status não está em supabase.ts gerado; cast explícito e localizado.
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            in: (col: string, vals: number[]) => Promise<{
              data: SyncStatusRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      })
        .from("sync_status")
        .select("*")
        .in("serie_id", [10764, 4390]);

      if (error) throw error;

      const rows: SyncStatusRow[] = data ?? [];
      if (rows.length === 0) {
        setState({ status: "stale", lastSync: null, error: null });
        return;
      }

      const hasError = rows.some((r) => r.status === "error");
      const lastSyncDate = rows
        .map((r) => r.last_sync_attempt)
        .filter((v): v is string => !!v)
        .sort()
        .pop() ?? null;

      // Check if indices are stale (last sync > 30 days ago)
      const isStale = rows.some((r) => {
        if (!r.last_processed_date) return true;
        const lastDate = new Date(r.last_processed_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastDate < thirtyDaysAgo;
      });

      if (hasError) {
        const errorMsg = rows.find((r) => r.status === "error")?.error_message ?? null;
        setState({ status: "error", lastSync: lastSyncDate, error: errorMsg });
      } else if (isStale) {
        setState({ status: "stale", lastSync: lastSyncDate, error: null });
      } else {
        setState({ status: "ok", lastSync: lastSyncDate, error: null });
      }
    } catch (err) {
      setState({
        status: "error",
        lastSync: null,
        error: err instanceof Error ? err.message : "Erro ao verificar status",
      });
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        results?: Record<string, SyncIndicesResult>;
      }>("sync-indices", {
        body: { serie_ids: [10764, 4390] },
      });

      if (error) throw error;

      const results = data?.results ?? {};
      const totalInserted = Object.values(results).reduce(
        (sum, r) => sum + (r.inserted ?? 0),
        0,
      );
      const hasErrors = Object.values(results).some((r) => !!r.error);

      if (hasErrors) {
        toast.warning(
          "Atenção: Não foi possível atualizar todos os índices (API do Banco Central indisponível). O sistema utilizará a última tabela salva."
        );
      } else if (totalInserted > 0) {
        toast.success(`Índices atualizados: ${totalInserted} novos registros.`);
      } else {
        toast.info("Índices já estão atualizados.");
      }

      await checkStatus();
    } catch (err) {
      toast.error(
        "Atenção: Não foi possível atualizar os índices automáticos (API do Banco Central indisponível)."
      );
      await checkStatus();
    } finally {
      setSyncing(false);
    }
  }, [checkStatus]);

  // Auto-check on mount
  useEffect(() => {
    checkStatus().then(() => {
      // Auto-sync if stale or never synced
      // We check inside the effect to avoid race conditions
    });
  }, [checkStatus]);

  // Auto-sync if stale on first load
  useEffect(() => {
    if (state.status === "stale" && !syncing) {
      triggerSync();
    }
  }, [state.status, syncing, triggerSync]);

  return { ...state, syncing, triggerSync, checkStatus };
}
