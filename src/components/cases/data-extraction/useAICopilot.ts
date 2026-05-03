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
  /** Resultado efetivo aplicado no dialog (modo atual). */
  effective: ResultByTipo[T];
  /** Loading. */
  loading: boolean;
  /** Erro humano (se houve falha na IA). */
  erro: string | null;
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
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"regex" | "ia" | "reconciliado">("regex");

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

  // Auto-aplicação inteligente
  useEffect(() => {
    if (!iaResult || !iaScore) return;
    // Cartão-Ponto: se houver reconciliação E pouca divergência, vai pro modo
    // reconciliado (o melhor de cada fonte). Senão usa a melhor isolada.
    if (tipo === "cartao_ponto" && reconciliacao) {
      const total = reconciliacao.contadores.total || 1;
      const pctDivergente =
        ((reconciliacao.contadores.differ +
          reconciliacao.contadores.onlyIa +
          reconciliacao.contadores.htDiscrepancias) /
          total) *
        100;
      // Sempre vai pra reconciliado quando temos as 2 fontes — usuário vê
      // os contadores e só edita os divergentes.
      setModo("reconciliado");
      if (pctDivergente > 0) {
        toast.message(
          `Co-piloto: IA ajustou ${Math.round(pctDivergente)}% das linhas. Revise os destacados.`,
          { duration: 4000 },
        );
      }
      return;
    }
    // Outros tipos: troca pra IA se score significativamente maior.
    if (iaScore.score >= regexScore.score + margemAutoAplicar) {
      setModo("ia");
      toast.success(
        `IA aplicada automaticamente (confiança IA ${iaScore.score} vs regex ${regexScore.score}).`,
        { duration: 3500 },
      );
    }
  }, [tipo, iaResult, iaScore, regexScore, reconciliacao, margemAutoAplicar]);

  const effective = useMemo<ResultByTipo[T]>(() => {
    if (modo === "ia" && iaResult) return iaResult;
    if (modo === "reconciliado" && reconciliacao && tipo === "cartao_ponto") {
      return reconciliacaoToParseResult(
        reconciliacao,
        parsed as ParseCartaoPontoResult,
      ) as never;
    }
    return parsed;
  }, [modo, iaResult, reconciliacao, parsed, tipo]);

  return {
    iaResult,
    iaScore,
    regexScore,
    reconciliacao,
    modo,
    setModo,
    effective,
    loading,
    erro,
  };
}
