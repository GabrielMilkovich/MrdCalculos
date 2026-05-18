/**
 * FASE 2 — cliente da edge function `extract-rubricas-ai`.
 *
 * Roda em PARALELO com o parser determinístico (não substitui). Quando
 * indisponível/timeout/erro, retorna `{ ok: false }` e o caller faz
 * fallback para parser-only.
 *
 * Anti-alucinação é feita SERVER-SIDE — aqui apenas tipamos a saída.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type ExtractRubricasAIDocType =
  | "holerite"
  | "cartao_ponto"
  | "ferias"
  | "faltas";

export interface ExtractedRubrica {
  codigo: string | null;
  nome: string;
  valor_vencimento: number | null;
  valor_desconto: number | null;
  quantidade: number | null;
}

export interface ExtractedTotalizadores {
  bruto: number | null;
  descontos: number | null;
  liquido: number | null;
}

export interface ExtractedPayload {
  competencia: string | null;
  rubricas: ExtractedRubrica[];
  totalizadores: ExtractedTotalizadores;
}

export interface DiscardedHallucination {
  field: string;
  suggested: string;
  reason: string;
}

export interface ExtractRubricasAISuccess {
  ok: true;
  extracted: ExtractedPayload;
  discarded_hallucinations: DiscardedHallucination[];
  ai_confidence: number;
  model: string;
  duration_ms: number;
}

export interface ExtractRubricasAIFailure {
  ok: false;
  error: "timeout" | "rate_limit" | "unavailable" | "openai_error" | "auth" | "bad_request";
  detail?: string;
}

export type ExtractRubricasAIResult = ExtractRubricasAISuccess | ExtractRubricasAIFailure;

/**
 * Invoca a edge function. Não joga exceções — todo erro vira `{ ok: false }`.
 * Caller decide o que fazer (tipicamente: fallback para parser-only).
 */
export async function callExtractRubricasAI(
  documentId: string,
  docType: ExtractRubricasAIDocType,
  ocrText: string,
): Promise<ExtractRubricasAIResult> {
  try {
    const { data, error } = await supabase.functions.invoke<
      | ExtractRubricasAISuccess
      | { error: string; partial?: boolean; detail?: string }
    >("extract-rubricas-ai", {
      body: {
        document_id: documentId,
        doc_type: docType,
        ocr_text: ocrText,
      },
    });

    if (error) {
      // supabase-js empacota status HTTP em error.context. 504/429 vêm
      // como FunctionsHttpError com body útil.
      const ctx = (error as { context?: { status?: number; body?: string } }).context;
      const status = ctx?.status ?? 0;
      if (status === 504) return { ok: false, error: "timeout" };
      if (status === 429) return { ok: false, error: "rate_limit" };
      if (status === 401 || status === 403) return { ok: false, error: "auth" };
      if (status >= 400 && status < 500) {
        return { ok: false, error: "bad_request", detail: ctx?.body };
      }
      logger.warn("[extract-rubricas-ai] edge function falhou", {
        status,
        detail: ctx?.body ?? String(error),
      });
      return { ok: false, error: "unavailable", detail: String(error).slice(0, 300) };
    }

    if (!data || typeof data !== "object" || !("extracted" in data)) {
      return { ok: false, error: "unavailable", detail: "resposta sem extracted" };
    }

    return { ok: true, ...(data as ExtractRubricasAISuccess) };
  } catch (err) {
    logger.error("[extract-rubricas-ai] exceção não tratada", { error: String(err) });
    return { ok: false, error: "unavailable", detail: String(err).slice(0, 300) };
  }
}
