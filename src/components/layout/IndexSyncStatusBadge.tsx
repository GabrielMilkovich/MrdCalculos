/**
 * IndexSyncStatusBadge — Enhanced sync status badge with detailed series info
 *
 * Shows the automatic sync status with:
 * - Color-coded badge (green=ok, amber=stale, red=error, blue=syncing)
 * - Manual refresh button
 * - Tooltip with last sync date and series breakdown
 * - Popover with per-series detail on click
 */
import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AutoSyncState,
  checkSyncStatus,
  triggerAutoSync,
  getDetailedSeriesStatus,
} from "@/lib/pjecalc/auto-sync-service";

interface SeriesDetail {
  serieId: number;
  nome: string;
  status: string;
  lastProcessedDate: string | null;
  lastSyncAttempt: string | null;
  errorMessage: string | null;
}

export function IndexSyncStatusBadge() {
  const [state, setState] = useState<AutoSyncState>({
    status: "loading",
    lastSyncAt: null,
    lastRunId: null,
    seriesSummary: null,
    errorMessage: null,
  });
  const [syncing, setSyncing] = useState(false);
  const [series, setSeries] = useState<SeriesDetail[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  const refresh = useCallback(async () => {
    const s = await checkSyncStatus();
    setState(s);
  }, []);

  const loadDetail = useCallback(async () => {
    try {
      const detail = await getDetailedSeriesStatus();
      setSeries(detail);
    } catch {
      // Silently fail for detail
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (showDetail) loadDetail();
  }, [showDetail, loadDetail]);

  // Auto-sync if stale on FIRST mount only (not on every status change)
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  useEffect(() => {
    if (state.status === "stale" && !syncing && !autoSyncAttempted) {
      setAutoSyncAttempted(true);
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, autoSyncAttempted]);

  const handleSync = async () => {
    setSyncing(true);
    setState((prev) => ({ ...prev, status: "syncing" }));
    try {
      const result = await triggerAutoSync();
      const hasErrors = result.summary.series_error > 0;
      const inserted = result.summary.total_inserted;

      if (hasErrors && result.summary.series_ok === 0) {
        toast.warning(
          "Nao foi possivel atualizar os indices. A API do Banco Central pode estar indisponivel."
        );
      } else if (hasErrors) {
        toast.warning(
          `Indices parcialmente atualizados: ${result.summary.series_ok}/${result.summary.total_series} series OK, ${inserted} registros.`
        );
      } else if (inserted > 0) {
        toast.success(
          `Indices atualizados: ${inserted} novos registros em ${result.summary.series_ok} series.`
        );
      } else {
        toast.info("Todos os indices ja estao atualizados.");
      }

      await refresh();
      if (showDetail) await loadDetail();
    } catch (err) {
      toast.error(
        "Falha ao sincronizar indices. Tente novamente mais tarde."
      );
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const statusConfig = {
    loading: {
      icon: Clock,
      label: "Verificando...",
      className:
        "text-muted-foreground border-border",
    },
    up_to_date: {
      icon: CheckCircle2,
      label: "Indices OK",
      className:
        "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800",
    },
    stale: {
      icon: Clock,
      label: "Desatualizado",
      className:
        "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
    },
    syncing: {
      icon: RefreshCw,
      label: "Sincronizando...",
      className:
        "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800",
    },
    error: {
      icon: AlertCircle,
      label: "Erro Sync",
      className:
        "text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800",
    },
  };

  const config = statusConfig[state.status];
  const Icon = config.icon;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR") : "N/A";

  const seriesStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={showDetail} onOpenChange={setShowDetail}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5"
                disabled={syncing || state.status === "loading"}
              >
                {syncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[10px] gap-1 px-2 py-0 h-5 font-normal ${config.className}`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                    <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            <p>
              {state.status === "up_to_date"
                ? `Ultima sincronizacao: ${formatDate(state.lastSyncAt)}`
                : state.status === "error"
                  ? `Erro: ${state.errorMessage || "Falha na sincronizacao"}`
                  : state.status === "syncing"
                    ? "Sincronizando indices com o Banco Central..."
                    : state.status === "stale"
                      ? "Indices desatualizados. Sincronizando..."
                      : "Verificando estado dos indices..."}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Indices Monetarios</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Sincronizar
            </Button>
          </div>

          {state.lastSyncAt && (
            <p className="text-[11px] text-muted-foreground">
              Ultima sincronizacao: {formatDate(state.lastSyncAt)}
            </p>
          )}

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {series.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Carregando detalhes...
              </p>
            ) : (
              series.map((s) => (
                <div
                  key={s.serieId}
                  className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {seriesStatusIcon(s.status)}
                    <span className="font-medium">{s.nome}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {s.lastProcessedDate
                      ? new Date(s.lastProcessedDate).toLocaleDateString(
                          "pt-BR",
                          { month: "short", year: "numeric" }
                        )
                      : "Sem dados"}
                  </span>
                </div>
              ))
            )}
          </div>

          {state.errorMessage && (
            <p className="text-[11px] text-red-500 border-t pt-2">
              {state.errorMessage}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
