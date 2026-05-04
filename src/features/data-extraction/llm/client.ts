/**
 * Cliente do front pra edge function `extract-via-llm`.
 *
 * Fluxo:
 *   1. Invoca edge function com (document_id, tipo_doc, ocr_text)
 *   2. Recebe output JSON
 *   3. Valida com Zod (rejeita alucinação fora do schema)
 *   4. Aplica invariantes anti-alucinação contra o OCR original
 *   5. Devolve output + telemetria (cached, usage)
 */
import { supabase } from "@/integrations/supabase/client";
import {
  validateLLMOutput,
  type LLMTipoDoc,
  type CartaoPontoLLMOutput,
  type FeriasLLMOutput,
  type FaltasLLMOutput,
  type HoleriteLLMOutput,
} from "./schemas";
import {
  validateAntiAlucinacao,
  LLMExtractError,
  type LLMExtractionError,
} from "./anti-alucinacao";

export { validateAntiAlucinacao, LLMExtractError };
export type { LLMExtractionError };

export interface LLMExtractionResponse {
  output: unknown;
  cached: boolean;
  model: string;
  mode?: "extract" | "deep";
  ocr_limpo?: string | null;
  /** True quando o edge truncou o OCR antes de enviar à OpenAI (>60k chars). */
  ocr_truncado?: boolean;
  /** Tamanho original do OCR enviado pelo client (pré-truncamento). */
  ocr_chars_originais?: number;
  /** Tamanho efetivamente processado pela OpenAI. */
  ocr_chars_processados?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/**
 * Invoca a edge function, valida com Zod, valida anti-alucinação.
 * Devolve o output validado.
 *
 * Aceita `signal: AbortSignal` opcional para cancelamento explícito (timeout
 * do client ou ação manual do usuário). Quando signal.aborted, lança
 * `LLMExtractError` com code='rede' e a razão repassada.
 */
export async function extractViaLLM<T extends LLMTipoDoc>(
  tipo: T,
  args: {
    document_id: string;
    ocr_text: string;
    mode?: "extract" | "deep";
    signal?: AbortSignal;
  },
): Promise<{
  output: T extends "cartao_ponto"
    ? CartaoPontoLLMOutput
    : T extends "recibo_ferias"
      ? FeriasLLMOutput
      : T extends "registro_faltas"
        ? FaltasLLMOutput
        : HoleriteLLMOutput;
  cached: boolean;
  model: string;
  mode: "extract" | "deep";
  ocr_limpo: string | null;
  ocrTruncado: boolean;
  ocrCharsOriginais: number | null;
  ocrCharsProcessados: number | null;
  usage?: LLMExtractionResponse["usage"];
}> {
  // Aborto pré-flight (caso o usuário tenha cancelado antes da chamada começar).
  if (args.signal?.aborted) {
    throw new LLMExtractError({
      code: "rede",
      message: "IA cancelada antes da chamada",
    });
  }
  // supabase-js 2.36+ aceita AbortSignal via FunctionInvokeOptions.
  // Tipagem ainda não cobre, daí o cast — funciona em runtime.
  const invokeOpts: Record<string, unknown> = {
    body: {
      document_id: args.document_id,
      tipo_doc: tipo,
      ocr_text: args.ocr_text,
      mode: args.mode ?? "extract",
    },
  };
  if (args.signal) invokeOpts.signal = args.signal;

  const { data, error } = await supabase.functions.invoke<LLMExtractionResponse>(
    "extract-via-llm",
    invokeOpts as Parameters<typeof supabase.functions.invoke>[1],
  );
  if (error) {
    // AbortError do fetch vira erro normal aqui — distingue por nome.
    const msg = (error as { name?: string }).name === "AbortError"
      ? "IA cancelada"
      : `Falha ao chamar IA: ${error.message}`;
    throw new LLMExtractError({
      code: "rede",
      message: msg,
      detalhes: error,
    });
  }
  if (!data?.output) {
    throw new LLMExtractError({
      code: "interna",
      message: "Resposta da IA sem output",
    });
  }

  let validated: ReturnType<typeof validateLLMOutput<T>>;
  try {
    validated = validateLLMOutput(tipo, data.output);
  } catch (e) {
    throw new LLMExtractError({
      code: "schema",
      message: "Output da IA não casa com o schema esperado",
      detalhes: e,
    });
  }

  validateAntiAlucinacao(
    tipo,
    validated as
      | CartaoPontoLLMOutput
      | FeriasLLMOutput
      | FaltasLLMOutput
      | HoleriteLLMOutput,
    args.ocr_text,
  );

  return {
    output: validated as never,
    cached: data.cached,
    model: data.model,
    mode: data.mode ?? "extract",
    ocr_limpo: data.ocr_limpo ?? null,
    ocrTruncado: data.ocr_truncado ?? false,
    ocrCharsOriginais: data.ocr_chars_originais ?? null,
    ocrCharsProcessados: data.ocr_chars_processados ?? null,
    usage: data.usage,
  };
}
