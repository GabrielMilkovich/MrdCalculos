/**
 * useAICopilot — hook que orquestra a IA como co-piloto sempre ativo
 * em paralelo ao parser regex.
 *
 * Comportamento:
 *   1. Ao montar (com `documentId` + `ocrText` + `enabled`), dispara a
 *      IA em background imediatamente.
 *   2. Quando IA termina, calcula:
 *      - Score da extração regex (atual)
 *      - Score da extração IA
 *      - Reconciliação (regex × IA) — só pra cartão-ponto
 *   3. Decide automaticamente:
 *      - Se IA tem score significativamente maior → aplica IA sozinha
 *      - Se há divergências → mantém regex + expõe diff pro operador
 *   4. Devolve estado pronto pra UI + função `apply` pra forçar aplicação
 *      de uma fonte específica.
 *
 * Errors são silenciosos no toast (já tratados no `extractViaLLM`) — o
 * hook só expõe `error` pra UI mostrar discreto se quiser.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  extractViaLLM,
  llmToCartaoPontoResult,
  llmToFaltasResult,
  llmToFeriasResult,
  llmToHoleriteResult,
  reconcileCartaoPonto,
  reconciliacaoToParseResult,
  scoreCartaoPonto,
  scoreFaltas,
  scoreFerias,
  scoreHolerite,
  LLMExtractError,
  type ConfidenceScore,
  type LLMTipoDoc,
  type ParseCartaoPontoResult,
  type ParseFaltasResult,
  type ParseFeriasResult,
  type ReconciliacaoCartaoPonto,
} from "@/features/data-extraction";
import type { HoleriteParseResult } from "@/features/data-extraction/parsers/holerite/types";

type ResultByTipo = {
  cartao_ponto: ParseCartaoPontoResult;
  recibo_ferias: ParseFeriasResult;
  registro_faltas: ParseFaltasResult;
  holerite: HoleriteParseResult;
};

interface AICopilotState<T extends LLMTipoDoc> {
  /** Resultado IA validado + adaptado (null enquanto carregando ou se falhou). */
  iaResult: ResultByTipo[T] | null;
  /** Score da extração da IA (calculado depois do iaResult chegar). */
  iaScore: ConfidenceScore | null;
  /** Score da extração regex (sempre presente). */
  regexScore: ConfidenceScore;
  /** Reconciliação calculada (apenas cartão-ponto). */
  reconciliacao: ReconciliacaoCartaoPonto | null;
  /** Modo de exibição atual. */
  modo: "regex" | "ia" | "reconciliado";
  /** Resultado efetivo aplicado no dialog (modo atual + overrides). */
  effective: ResultByTipo[T];
  /** Loading. */
  loading: boolean;
  /** Erro humano (se houve falha na IA). */
  erro: string | null;
  /** Overrides manuais por data (apenas cartão-ponto, modo reconciliado). */
  overrides: Map<string, "regex" | "ia">;
}

interface UseAICopilotArgs<T extends LLMTipoDoc> {
  tipo: T;
  documentId: string | null | undefined;
  ocrText: string;
  parsed: ResultByTipo[T];
  /** Quando false, não dispara a IA (ex: teste local sem rede). */
  enabled?: boolean;
  /** Margem mínima de score IA - score regex pra auto-aplicar (default 10). */
  margemAutoAplicar?: number;
}

interface UseAICopilotResult<T extends LLMTipoDoc> extends AICopilotState<T> {
  /** Força aplicação manual da fonte (usuário clicou em algo). */
  setModo: (modo: "regex" | "ia" | "reconciliado") => void;
  /** Define manualmente a fonte para um dia específico (cartão-ponto). */
  setOverride: (data: string, fonte: "regex" | "ia") => void;
  /** Remove um override manual. */
  clearOverride: (data: string) => void;
  /** Re-roda IA em modo profundo (limpa OCR + extrai). */
  runDeep: () => Promise<void>;
  /** Loading do modo profundo (separado do auto-trigger). */
  loadingDeep: boolean;
}

function calcScore<T extends LLMTipoDoc>(
  tipo: T,
  parsed: ResultByTipo[T],
  ocr: string,
): ConfidenceScore {
  if (tipo === "cartao_ponto")
    return scoreCartaoPonto(parsed as ParseCartaoPontoResult, ocr);
  if (tipo === "recibo_ferias")
    return scoreFerias(parsed as ParseFeriasResult, ocr);
  if (tipo === "registro_faltas")
    return scoreFaltas(parsed as ParseFaltasResult, ocr);
  return scoreHolerite(parsed as HoleriteParseResult, ocr);
}

function adaptarLLM<T extends LLMTipoDoc>(
  tipo: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any,
): ResultByTipo[T] {
  if (tipo === "cartao_ponto") return llmToCartaoPontoResult(output) as never;
  if (tipo === "recibo_ferias") return llmToFeriasResult(output) as never;
  if (tipo === "registro_faltas") return llmToFaltasResult(output) as never;
  return llmToHoleriteResult(output) as never;
}

export function useAICopilot<T extends LLMTipoDoc>(
  args: UseAICopilotArgs<T>,
): UseAICopilotResult<T> {
  const {
    tipo,
    documentId,
    ocrText,
    parsed,
    enabled = true,
    margemAutoAplicar = 10,
  } = args;

  const [iaResult, setIaResult] = useState<ResultByTipo[T] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDeep, setLoadingDeep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"regex" | "ia" | "reconciliado">("regex");
  const [overrides, setOverrides] = useState<Map<string, "regex" | "ia">>(new Map());

  const runDeep = async () => {
    if (!documentId || !ocrText) return;
    setLoadingDeep(true);
    setErro(null);
    try {
      const { output, usage } = await extractViaLLM(tipo, {
        document_id: documentId,
        ocr_text: ocrText,
        mode: "deep",
      });
      const result = adaptarLLM(tipo, output);
      setIaResult(result);
      const tokens =
        (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      toast.success(
        `Análise profunda da IA aplicada (${tokens.toLocaleString("pt-BR")} tokens). Confira as mudanças.`,
        { duration: 4000 },
      );
    } catch (e) {
      if (e instanceof LLMExtractError) {
        setErro(e.payload.message);
        toast.error(`IA profunda falhou: ${e.payload.message}`);
      } else {
        const msg = (e as Error).message;
        setErro(msg);
        toast.error(`IA profunda falhou: ${msg}`);
      }
    } finally {
      setLoadingDeep(false);
    }
  };

  const setOverride = (data: string, fonte: "regex" | "ia") => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(data, fonte);
      return next;
    });
  };
  const clearOverride = (data: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(data);
      return next;
    });
  };

  const regexScore = useMemo(() => calcScore(tipo, parsed, ocrText), [tipo, parsed, ocrText]);
  const iaScore = useMemo(
    () => (iaResult ? calcScore(tipo, iaResult, ocrText) : null),
    [tipo, iaResult, ocrText],
  );

  const reconciliacao = useMemo(() => {
    if (tipo !== "cartao_ponto" || !iaResult) return null;
    return reconcileCartaoPonto(
      parsed as ParseCartaoPontoResult,
      iaResult as ParseCartaoPontoResult,
    );
  }, [tipo, parsed, iaResult]);

  // Dispara IA em background ao montar
  useEffect(() => {
    if (!enabled || !documentId || !ocrText || ocrText.length < 20) return;
    let cancelado = false;
    setLoading(true);
    setErro(null);
    extractViaLLM(tipo, { document_id: documentId, ocr_text: ocrText })
      .then(({ output, cached }) => {
        if (cancelado) return;
        const result = adaptarLLM(tipo, output);
        setIaResult(result);
        if (!cached) toast.success("IA terminou — co-piloto ativo.", { duration: 2000 });
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        if (e instanceof LLMExtractError) {
          setErro(e.payload.message);
        } else {
          setErro((e as Error).message);
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [enabled, documentId, ocrText, tipo]);

  // Auto-aplicação inteligente + auto-deep quando muita divergência.
  const [autoDeepDisparado, setAutoDeepDisparado] = useState(false);
  useEffect(() => {
    if (!iaResult || !iaScore) return;
    if (tipo === "cartao_ponto" && reconciliacao) {
      const total = reconciliacao.contadores.total || 1;
      const pctDivergente =
        ((reconciliacao.contadores.differ +
          reconciliacao.contadores.onlyIa +
          reconciliacao.contadores.htDiscrepancias) /
          total) *
        100;
      setModo("reconciliado");
      if (pctDivergente > 0) {
        toast.message(
          `Co-piloto: IA ajustou ${Math.round(pctDivergente)}% das linhas. Revise os destacados.`,
          { duration: 4000 },
        );
      }
      // AUTO-DEEP: se muita divergência (>20%) E ainda não disparou, roda
      // o modo profundo automaticamente — limpa OCR e re-extrai.
      if (
        pctDivergente >= 20 &&
        !autoDeepDisparado &&
        documentId &&
        ocrText
      ) {
        setAutoDeepDisparado(true);
        toast.message(
          "Muita divergência detectada — disparando análise profunda automaticamente.",
          { duration: 3000 },
        );
        void runDeep();
      }
      return;
    }
    if (iaScore.score >= regexScore.score + margemAutoAplicar) {
      setModo("ia");
      toast.success(
        `IA aplicada automaticamente (confiança IA ${iaScore.score} vs regex ${regexScore.score}).`,
        { duration: 3500 },
      );
    }
  }, [
    tipo,
    iaResult,
    iaScore,
    regexScore,
    reconciliacao,
    margemAutoAplicar,
    autoDeepDisparado,
    documentId,
    ocrText,
  ]);

  const effective = useMemo<ResultByTipo[T]>(() => {
    if (modo === "ia" && iaResult) return iaResult;
    if (modo === "reconciliado" && reconciliacao && tipo === "cartao_ponto") {
      // Aplica overrides manuais antes de gerar o resultado final.
      const reconAjustada =
        overrides.size === 0
          ? reconciliacao
          : {
              ...reconciliacao,
              dias: reconciliacao.dias.map((d) => {
                const ov = overrides.get(d.data);
                if (!ov) return d;
                const fonte =
                  ov === "regex" ? d.fontes.regex : d.fontes.ia;
                if (!fonte) return d;
                return {
                  ...d,
                  escolhida: fonte,
                  origemEscolhida: ov,
                };
              }),
            };
      return reconciliacaoToParseResult(
        reconAjustada,
        parsed as ParseCartaoPontoResult,
      ) as never;
    }
    return parsed;
  }, [modo, iaResult, reconciliacao, parsed, tipo, overrides]);

  return {
    iaResult,
    iaScore,
    regexScore,
    reconciliacao,
    modo,
    setModo,
    effective,
    loading,
    loadingDeep,
    erro,
    overrides,
    setOverride,
    clearOverride,
    runDeep,
  };
}
