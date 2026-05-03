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
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/**
 * Invoca a edge function, valida com Zod, valida anti-alucinação.
 * Devolve o output validado.
 */
export async function extractViaLLM<T extends LLMTipoDoc>(
  tipo: T,
  args: { document_id: string; ocr_text: string },
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
  usage?: LLMExtractionResponse["usage"];
}> {
  const { data, error } = await supabase.functions.invoke<LLMExtractionResponse>(
    "extract-via-llm",
    {
      body: {
        document_id: args.document_id,
        tipo_doc: tipo,
        ocr_text: args.ocr_text,
      },
    },
  );
  if (error) {
    throw new LLMExtractError({
      code: "rede",
      message: `Falha ao chamar IA: ${error.message}`,
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
    usage: data.usage,
  };
}
