/**
 * Badge visual de confiança da extração (alta/média/baixa) com tooltip
 * mostrando a lista de razões. Usado no header dos 4 review dialogs.
 */
import { ShieldCheck, ShieldAlert, ShieldX, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfidenceScore } from "@/features/data-extraction";

interface Props {
  score: ConfidenceScore;
  /**
   * Quando true, sinaliza visualmente que a IA recuperou dados que o regex
   * não conseguiu extrair (ex: dias adicionais via reconciliação). Usado
   * para chamar atenção do operador para o ganho da IA.
   */
  iaSalvouDias?: boolean;
}

export function ConfidenceBadge({ score, iaSalvouDias = false }: Props) {
  const styles = (() => {
    switch (score.level) {
      case "alta":
        return {
          icon: <ShieldCheck className="h-3 w-3" />,
          tone:
            "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border-emerald-300",
          label: "Alta confiança",
        };
      case "media":
        return {
          icon: <ShieldAlert className="h-3 w-3" />,
          tone:
            "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-300",
          label: "Média confiança",
        };
      case "baixa":
        return {
          icon: <ShieldX className="h-3 w-3" />,
          tone:
            "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border-rose-300",
          label: "Baixa confiança — revise",
        };
    }
  })();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 text-[10px] ${styles.tone}`}>
            {styles.icon}
            <span>{styles.label}</span>
            <span className="font-mono opacity-70">{score.score}/100</span>
            {iaSalvouDias && (
              <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-300 ml-0.5" />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md">
          {iaSalvouDias && (
            <p className="text-xs mb-1 text-violet-700 dark:text-violet-300">
              ✨ IA recuperou dados que o parser regex perdeu — score reflete a fonte combinada.
            </p>
          )}
          {score.reasons.length === 0 ? (
            <p className="text-xs">Nenhum sinal de inconsistência detectado.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {score.reasons.slice(0, 6).map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
              {score.reasons.length > 6 && (
                <li className="opacity-60">
                  ...e mais {score.reasons.length - 6} item(ns)
                </li>
              )}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
