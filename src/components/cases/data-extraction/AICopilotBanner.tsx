/**
 * AICopilotBanner — banner persistente no header dos review dialogs
 * mostrando o status do co-piloto (regex × IA × reconciliado),
 * contadores agregados, e botões pra trocar de fonte.
 *
 * Pensado pra que o advogado:
 *   - Veja em 1s o status global ("OK: 178 / Revisar: 4")
 *   - Saiba qual fonte está aplicada
 *   - Possa forçar regex/IA/reconciliado com 1 clique
 */
import { CheckCircle2, AlertTriangle, AlertOctagon, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfidenceScore, ReconciliacaoCartaoPonto } from "@/features/data-extraction";

interface Props {
  loading: boolean;
  loadingDeep?: boolean;
  erro: string | null;
  regexScore: ConfidenceScore;
  iaScore: ConfidenceScore | null;
  reconciliacao: ReconciliacaoCartaoPonto | null;
  modo: "regex" | "ia" | "reconciliado";
  onModoChange: (modo: "regex" | "ia" | "reconciliado") => void;
  /** Quando provido, exibe botão "Análise Profunda" pra reprocessar IA com cleanup. */
  onRunDeep?: () => void;
}

export function AICopilotBanner({
  loading,
  loadingDeep = false,
  erro,
  regexScore,
  iaScore,
  reconciliacao,
  modo,
  onModoChange,
  onRunDeep,
}: Props) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Status do co-piloto */}
        {loading && !iaScore && (
          <Badge variant="outline" className="gap-1 bg-violet-50 dark:bg-violet-950/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>IA analisando em paralelo…</span>
          </Badge>
        )}

        {erro && !iaScore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="gap-1 bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200 border-rose-300"
              >
                <AlertOctagon className="h-3 w-3" />
                <span>IA falhou (regex aplicado)</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{erro}</TooltipContent>
          </Tooltip>
        )}

        {/* Reconciliação cartão-ponto */}
        {reconciliacao && (
          <>
            <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 border-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              OK: {reconciliacao.contadores.agree}
            </Badge>
            {reconciliacao.contadores.differ > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 border-amber-300"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Revisar: {reconciliacao.contadores.differ}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Dias em que regex e IA divergem. Sistema escolheu a fonte com
                  Horas Trabalhadas batendo (cross-check).
                </TooltipContent>
              </Tooltip>
            )}
            {reconciliacao.contadores.onlyIa > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 bg-violet-50 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200 border-violet-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    IA salvou: {reconciliacao.contadores.onlyIa}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Dias que o parser regex perdeu mas a IA conseguiu extrair.
                </TooltipContent>
              </Tooltip>
            )}
            {reconciliacao.contadores.htDiscrepancias > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200 border-rose-300"
                  >
                    <AlertOctagon className="h-3 w-3" />
                    HT divergente: {reconciliacao.contadores.htDiscrepancias}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Dias em que a soma das batidas não bate com o evento "Horas
                  Trabalhadas" do OCR (±5min). Possível erro de extração.
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        {/* Score (quando há IA) — comparativo */}
        {iaScore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-[10px] font-mono">
                regex {regexScore.score} · IA {iaScore.score}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>
                  <strong>regex ({regexScore.level}):</strong>
                  {regexScore.reasons.length === 0
                    ? " sem ressalvas"
                    : ` ${regexScore.reasons[0]}`}
                </div>
                <div>
                  <strong>IA ({iaScore.level}):</strong>
                  {iaScore.reasons.length === 0
                    ? " sem ressalvas"
                    : ` ${iaScore.reasons[0]}`}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Botões de modo (só quando há IA disponível) */}
        {iaScore && (
          <div className="flex items-center gap-1 ml-auto">
            <Button
              size="sm"
              variant={modo === "regex" ? "default" : "outline"}
              className="h-6 text-[10px] px-2"
              onClick={() => onModoChange("regex")}
            >
              regex
            </Button>
            <Button
              size="sm"
              variant={modo === "ia" ? "default" : "outline"}
              className="h-6 text-[10px] px-2"
              onClick={() => onModoChange("ia")}
            >
              IA
            </Button>
            {reconciliacao && (
              <Button
                size="sm"
                variant={modo === "reconciliado" ? "default" : "outline"}
                className="h-6 text-[10px] px-2"
                onClick={() => onModoChange("reconciliado")}
              >
                co-piloto
              </Button>
            )}
            {onRunDeep && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 gap-1 border-violet-300 text-violet-900 dark:border-violet-700 dark:text-violet-200"
                    onClick={onRunDeep}
                    disabled={loadingDeep}
                  >
                    {loadingDeep ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    {loadingDeep ? "limpando…" : "análise profunda"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Limpa o OCR (corrige multilinha, dia-da-semana, completa
                  buracos de calendário) ANTES de re-extrair com a IA.
                  Custa ~2× mais tokens, mas pega bugs sutis. Use quando
                  desconfiar de erros silenciosos.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
