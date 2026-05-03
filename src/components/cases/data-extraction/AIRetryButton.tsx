/**
 * Botão "Tentar com IA" — exibido nos review dialogs quando o score
 * está baixo (ou sob demanda). Invoca a edge function `extract-via-llm`,
 * valida com Zod + anti-alucinação, e chama `onResult` com o output
 * convertido para o tipo do parser (drop-in replacement).
 */
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  extractViaLLM,
  llmToCartaoPontoResult,
  llmToFaltasResult,
  llmToFeriasResult,
  llmToHoleriteResult,
  LLMExtractError,
  type LLMTipoDoc,
} from "@/features/data-extraction";
import type { ParseCartaoPontoResult } from "@/features/data-extraction";
import type { ParseFeriasResult } from "@/features/data-extraction";
import type { ParseFaltasResult } from "@/features/data-extraction";

type ResultByTipo = {
  cartao_ponto: ParseCartaoPontoResult;
  recibo_ferias: ParseFeriasResult;
  registro_faltas: ParseFaltasResult;
  holerite: ReturnType<typeof llmToHoleriteResult>;
};

interface Props<T extends LLMTipoDoc> {
  tipo: T;
  documentId: string | null;
  ocrText: string;
  onResult: (result: ResultByTipo[T]) => void;
  size?: "sm" | "default";
  label?: string;
  /** Quando true, força aparência destacada (ex: score baixo). */
  emphatic?: boolean;
}

export function AIRetryButton<T extends LLMTipoDoc>({
  tipo,
  documentId,
  ocrText,
  onResult,
  size = "sm",
  label = "Tentar com IA",
  emphatic = false,
}: Props<T>) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!documentId) {
      toast.error("Documento sem ID — não é possível chamar a IA.");
      return;
    }
    setLoading(true);
    try {
      const { output, cached, usage } = await extractViaLLM(tipo, {
        document_id: documentId,
        ocr_text: ocrText,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      if (tipo === "cartao_ponto") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = llmToCartaoPontoResult(output as any);
      } else if (tipo === "recibo_ferias") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = llmToFeriasResult(output as any);
      } else if (tipo === "registro_faltas") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = llmToFaltasResult(output as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = llmToHoleriteResult(output as any);
      }
      onResult(result as ResultByTipo[T]);
      const tokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      toast.success(
        cached
          ? "IA: resultado em cache aplicado."
          : `IA aplicada (${tokens.toLocaleString("pt-BR")} tokens).`,
      );
    } catch (e) {
      if (e instanceof LLMExtractError) {
        const msgs: Record<typeof e.payload.code, string> = {
          alucinacao: "IA tentou inventar dados que não estão no OCR — descartado.",
          schema: "Resposta da IA fora do schema esperado.",
          rede: "Falha de rede ao chamar a IA.",
          openai: "Erro do gateway OpenAI.",
          auth: "Sessão inválida.",
          interna: "Erro interno na extração via IA.",
        };
        toast.error(msgs[e.payload.code] ?? e.message);
      } else {
        toast.error(`IA falhou: ${(e as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={emphatic ? "default" : "outline"}
      onClick={handleClick}
      disabled={loading || !documentId}
      className={`gap-1.5 ${emphatic ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
