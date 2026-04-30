/**
 * Hook ergonômico para reportar erros em componentes.
 *
 * Uso:
 *   const report = useErrorReporter("CaseBriefing");
 *   try { ... } catch (e) { report(e, { caseId }); }
 */
import { useCallback } from "react";
import { reportError } from "@/lib/error-reporter";

export function useErrorReporter(source: string) {
  return useCallback(
    (err: unknown, context?: Record<string, unknown>) => {
      const e = err instanceof Error ? err : new Error(String(err));
      void reportError({
        message: e.message,
        stack: e.stack,
        source,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
        context,
      });
    },
    [source],
  );
}
