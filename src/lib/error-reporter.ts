/**
 * Reporter global de erros de UI.
 *
 * Centraliza:
 *  - Listeners `window.onerror` e `window.unhandledrejection` (em browsers).
 *  - Toast amigável para o usuário com botão "Detalhes" expandindo o stack.
 *  - Log estruturado via `logger.error` (com source previsível).
 *  - Persistência best-effort em `app_error_log` quando a sessão Supabase está
 *    autenticada (insert direto; RLS garante owner-only).
 *
 * Não-objetivos:
 *  - Não tenta deduplicar erros (volume baixo esperado).
 *  - Não bloqueia UI quando o insert falha — apenas loga warn.
 */
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";

export interface ReportedError {
  message: string;
  stack?: string;
  /** Origem lógica: "react-boundary" | "unhandled-rejection" | "window-error" | "react-query" | "manual" */
  source: string;
  /** Rota atual no momento do erro. */
  route?: string;
  /** Contexto adicional opcional (queryKey, mutationKey, etc). */
  context?: Record<string, unknown>;
}

/**
 * Extrai mensagem legível de qualquer tipo de erro. Crítico porque:
 *   - PostgrestError do supabase é objeto plain ({ code, message, details })
 *   - String(plainObject) → "[object Object]"
 *   - Erros de fetch podem ser TypeError sem message
 *   - Strings simples passam direto
 */
export function extractErrorMessage(err: unknown): { message: string; stack?: string } {
  if (err === null || err === undefined) return { message: "Erro desconhecido" };
  if (err instanceof Error) return { message: err.message || err.name || "Erro", stack: err.stack };
  if (typeof err === "string") return { message: err };
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    // PostgrestError, fetch Response.error, axios, etc.
    const msg =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.error_description === "string" && obj.error_description) ||
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.statusText === "string" && obj.statusText) ||
      "";
    if (msg) {
      // Inclui code/hint/details quando presentes (PostgrestError)
      const extras: string[] = [];
      if (typeof obj.code === "string" && obj.code) extras.push(`code=${obj.code}`);
      if (typeof obj.hint === "string" && obj.hint) extras.push(`hint=${obj.hint}`);
      if (typeof obj.details === "string" && obj.details) extras.push(`details=${obj.details}`);
      return {
        message: extras.length ? `${msg} (${extras.join(", ")})` : msg,
        stack: typeof obj.stack === "string" ? obj.stack : undefined,
      };
    }
    // Sem message — serializa o objeto inteiro pra preservar contexto
    try {
      return { message: JSON.stringify(err) };
    } catch {
      return { message: String(err) };
    }
  }
  return { message: String(err) };
}

/** Habilita listeners globais. Chamado uma vez em main.tsx. Idempotente. */
let installed = false;

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev: ErrorEvent) => {
    const { message, stack } = extractErrorMessage(ev.error ?? ev.message);
    void reportError({
      message,
      stack,
      source: "window-error",
      route: getRoute(),
    });
  });

  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    const { message, stack } = extractErrorMessage(ev.reason);
    void reportError({
      message,
      stack,
      source: "unhandled-rejection",
      route: getRoute(),
    });
  });
}

/**
 * Reporta um erro: toast + log + persistência.
 * Sempre seguro (não lança). Pode ser chamado de qualquer lugar.
 */
export async function reportError(input: ReportedError): Promise<void> {
  try {
    logger.error(`[${input.source}] ${input.message}`, undefined, {
      stack: input.stack,
      route: input.route,
      ...(input.context ?? {}),
    });
    showErrorToast(input);
    await persistError(input);
  } catch {
    // Garante que o reporter nunca propaga erro.
  }
}

function getRoute(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function showErrorToast(input: ReportedError): void {
  const desc = truncate(input.stack ?? input.message, 240);
  toast.error(input.message || "Erro inesperado", {
    description: desc,
    duration: 8000,
    action: {
      label: "Detalhes",
      onClick: () => {
        const full = JSON.stringify(
          {
            message: input.message,
            source: input.source,
            route: input.route,
            stack: input.stack,
            context: input.context,
            at: new Date().toISOString(),
          },
          null,
          2,
        );
        copyToClipboard(full);
        toast.success("Detalhes copiados para a área de transferência");
      },
    },
  });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

export function copyToClipboard(text: string): void {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {
      /* ignore */
    });
  }
}

/**
 * Insere o erro em `public.app_error_log`. RLS owner-only.
 * Falha silenciosa: se não há sessão ou tabela não existe, apenas pula.
 */
async function persistError(input: ReportedError): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return; // Não persistimos para anônimos.
    const row = {
      user_id: userId,
      message: input.message.slice(0, 1000),
      stack: (input.stack ?? "").slice(0, 8000),
      source: input.source,
      route: (input.route ?? "").slice(0, 500),
      context: input.context ?? null,
    };
    const { error } = await fromUntyped("app_error_log").insert(row);
    if (error) {
      logger.warn("error-reporter: persistência falhou", { code: error.code, msg: error.message });
    }
  } catch (e) {
    logger.warn("error-reporter: persistência lançou", { error: String(e) });
  }
}
