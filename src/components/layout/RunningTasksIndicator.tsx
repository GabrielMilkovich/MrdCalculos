/**
 * Indicador compacto de tarefas em andamento (queries + mutations do react-query).
 * - Spinner quando há pelo menos uma fetch/mutation pendente.
 * - Após terminar, mostra ✓ por 3s; se a última mutação falhou, mostra ✗.
 *
 * Implementação minimalista: depende apenas de hooks já fornecidos pelo
 * @tanstack/react-query, sem subscrever caches manualmente.
 */
import { useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLastMutationError, subscribeLastMutationError } from "@/lib/last-mutation-status";

type Phase = "idle" | "running" | "ok" | "error";

export interface RunningTasksIndicatorProps {
  /** Sobrescreve a fonte global de erro (útil em testes). */
  lastError?: boolean;
  /** ms para esconder ✓/✗ após sucesso/erro. */
  flashMs?: number;
}

export function RunningTasksIndicator({ lastError, flashMs = 3000 }: RunningTasksIndicatorProps = {}) {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  const [hasError, setHasError] = useState<boolean>(getLastMutationError());

  useEffect(() => {
    return subscribeLastMutationError(setHasError);
  }, []);

  const effectiveError = lastError ?? hasError;

  const [phase, setPhase] = useState<Phase>("idle");
  const wasActive = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      wasActive.current = true;
      setPhase("running");
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      return;
    }
    if (wasActive.current) {
      wasActive.current = false;
      setPhase(effectiveError ? "error" : "ok");
      timer.current = setTimeout(() => setPhase("idle"), flashMs);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, effectiveError, flashMs]);

  if (phase === "idle") return null;

  const label =
    phase === "running"
      ? `${fetching + mutating} tarefa${fetching + mutating > 1 ? "s" : ""}`
      : phase === "ok"
        ? "Concluído"
        : "Falhou";

  return (
    <div
      role="status"
      aria-live="polite"
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        phase === "running" && "bg-muted text-muted-foreground",
        phase === "ok" && "bg-emerald-500/10 text-emerald-600",
        phase === "error" && "bg-destructive/10 text-destructive",
      )}
    >
      {phase === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {phase === "ok" && <Check className="h-3 w-3" />}
      {phase === "error" && <X className="h-3 w-3" />}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
