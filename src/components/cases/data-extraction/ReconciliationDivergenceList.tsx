/**
 * ReconciliationDivergenceList — lista expansível das divergências
 * regex × IA por dia, com escolha de fonte por linha.
 *
 * Mostrada no header do CartaoPontoReviewDialog quando há reconciliação.
 * Cada item:
 *   - Data + status (differ / only-X)
 *   - Diff resumido (campo: regex valor → IA valor)
 *   - Botões: usar regex / usar IA
 *   - Click no card → scroll para a linha correspondente na tabela
 */
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ApuracaoReconciliada,
  ReconciliacaoCartaoPonto,
} from "@/features/data-extraction";

interface Props {
  reconciliacao: ReconciliacaoCartaoPonto;
  /** Override por data: quando o user escolhe regex/IA pra um dia específico. */
  overrides: Map<string, "regex" | "ia">;
  onChooseRegex: (data: string) => void;
  onChooseIA: (data: string) => void;
  /** Callback opcional ao clicar no card (pra scroll). */
  onJumpTo?: (data: string) => void;
}

function formatHHMM(yyyymmdd: string): string {
  const [yyyy, mm, dd] = yyyymmdd.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function describeDia(d: ApuracaoReconciliada): string {
  if (d.status === "agree") return "ok";
  if (d.status === "only-regex") return "IA não trouxe — usar regex";
  if (d.status === "only-ia") return "regex falhou — IA salvou";
  if (d.status === "both-empty") return "ambos vazios";
  return d.diffs.map((x) => `${x.campo}: ${x.detalhe}`).join(" · ");
}

export function ReconciliationDivergenceList({
  reconciliacao,
  overrides,
  onChooseRegex,
  onChooseIA,
  onJumpTo,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const duvidosos = reconciliacao.dias.filter(
    (d) => d.status !== "agree" && d.status !== "both-empty",
  );

  if (duvidosos.length === 0) return null;

  return (
    <div className="border rounded-md overflow-hidden bg-muted/20 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span className="font-medium">
          Divergências regex × IA: {duvidosos.length} dia(s)
        </span>
        <span className="text-muted-foreground text-[10px]">
          (clique pra expandir e revisar uma a uma)
        </span>
      </button>
      {expanded && (
        <div className="divide-y border-t max-h-[280px] overflow-y-auto">
          {duvidosos.map((d) => {
            const decisao = overrides.get(d.data) ?? d.origemEscolhida;
            return (
              <div
                key={d.data}
                className="p-2 hover:bg-muted/30 cursor-pointer"
                onClick={() => onJumpTo?.(d.data)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {formatHHMM(d.data)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      d.status === "differ"
                        ? "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                        : d.status === "only-ia"
                          ? "bg-violet-50 border-violet-300 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200"
                          : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    {d.status === "differ"
                      ? "diverge"
                      : d.status === "only-ia"
                        ? "IA salvou"
                        : d.status === "only-regex"
                          ? "só regex"
                          : d.status}
                  </Badge>
                  {d.htDiscrepancia && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                    >
                      <AlertOctagon className="h-3 w-3 mr-1" />
                      HT divergente
                    </Badge>
                  )}
                  <span className="flex-1 truncate text-[11px] text-muted-foreground font-mono">
                    {describeDia(d)}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant={decisao === "regex" ? "default" : "outline"}
                      disabled={!d.fontes.regex}
                      onClick={() => onChooseRegex(d.data)}
                      className="h-6 text-[10px] px-2"
                    >
                      {decisao === "regex" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      regex
                    </Button>
                    <Button
                      size="sm"
                      variant={decisao === "ia" ? "default" : "outline"}
                      disabled={!d.fontes.ia}
                      onClick={() => onChooseIA(d.data)}
                      className="h-6 text-[10px] px-2"
                    >
                      {decisao === "ia" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      IA
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
