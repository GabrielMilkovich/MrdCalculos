/**
 * FASE 3.3 — painel de comparação parser × LLM no HoleritePreviewDialog.
 *
 * Renderização condicional baseada em `llm_status` + `taxa_concordancia`:
 *   - `unavailable`/`timeout`/`error` → banner amber (parser-only)
 *   - taxa ≥ 0.95   → banner verde compacto (concordância alta)
 *   - taxa ≥ 0.70   → banner amber expansor com diff side-by-side
 *   - taxa < 0.70   → banner vermelho (bloqueador externo, decidido pelo
 *                     próprio dialog combinando confidence.bloqueador)
 *
 * O bloqueio em si fica no dialog pai (HoleritePreviewDialog) — este
 * componente só RENDERIZA o estado. A regra "taxa<0.70 força bloqueador"
 * é aplicada via prop `onForceBloqueador` se quisermos manter UI pura
 * (FASE futura — por ora só sinaliza, não força).
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import type { LlmStatus } from "@/features/data-extraction/export/per-doc";
import type { ComparacaoResultado } from "@/features/data-extraction/quality/comparador-llm-parser";

interface Props {
  llmStatus: LlmStatus;
  comparacao?: ComparacaoResultado;
  aiConfidence?: number;
}

function statusLabel(s: LlmStatus): string {
  switch (s) {
    case "timeout":
      return "Tempo esgotado (60s)";
    case "rate_limit":
      return "Limite de chamadas atingido";
    case "unavailable":
      return "IA indisponível";
    case "error":
      return "Erro na chamada IA";
    case "not_attempted":
      return "IA não foi chamada";
    default:
      return "OK";
  }
}

export function ComparacaoLLMPanel({ llmStatus, comparacao, aiConfidence }: Props) {
  const [expandido, setExpandido] = useState(false);

  // Estado 1: LLM falhou / não chamada → banner amber informativo.
  if (llmStatus !== "ok" || !comparacao) {
    return (
      <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-0.5">
        <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
          <Sparkles className="h-3.5 w-3.5" />
          Verificação automática indisponível
        </div>
        <div className="text-amber-800 dark:text-amber-200">
          Revise os dados manualmente com mais cuidado.
        </div>
      </div>
    );
  }

  const taxa = comparacao.taxa_concordancia;
  const pct = Math.round(taxa * 100);
  const divergencias = comparacao.matches.filter(
    (m) => m.tipo !== "match",
  ).length;

  // Estado 2: alta concordância (≥95%) → banner verde compacto.
  if (taxa >= 0.95) {
    return (
      <div className="border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 rounded p-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-emerald-900 dark:text-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dados verificados automaticamente — {pct}% de consistência
        </div>
      </div>
    );
  }

  // Estado 3: concordância baixa (<70%) → banner vermelho.
  if (taxa < 0.70) {
    return (
      <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded p-3 text-sm space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-red-900 dark:text-red-100">
          <XCircle className="h-4 w-4" />
          {divergencias} {divergencias === 1 ? "verba precisa" : "verbas precisam"} de conferência manual
        </div>
        <div className="text-red-800 dark:text-red-200 text-xs">
          Revise os dados destacados antes de confirmar.
        </div>
        <ButtonExpansor expandido={expandido} setExpandido={setExpandido} divergencias={divergencias} />
        {expandido && <DiffTable comparacao={comparacao} />}
      </div>
    );
  }

  // Estado 4: concordância média (70-95%) → expansor amber.
  return (
    <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-1">
      <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100">
        <AlertTriangle className="h-3.5 w-3.5" />
        {divergencias} {divergencias === 1 ? "verba precisa" : "verbas precisam"} de conferência
      </div>
      <ButtonExpansor expandido={expandido} setExpandido={setExpandido} divergencias={divergencias} />
      {expandido && <DiffTable comparacao={comparacao} />}
    </div>
  );
}

function ButtonExpansor({
  expandido,
  setExpandido,
  divergencias,
}: {
  expandido: boolean;
  setExpandido: (b: boolean) => void;
  divergencias: number;
}) {
  if (divergencias === 0) return null;
  return (
    <button
      type="button"
      onClick={() => setExpandido(!expandido)}
      className="text-[11px] underline text-amber-900 dark:text-amber-100 hover:no-underline"
    >
      {expandido ? "Ocultar diff" : `Ver diff (${divergencias})`}
    </button>
  );
}

/**
 * Tabela side-by-side parser × LLM. Cores por tipo:
 *   - so_parser:  amber (parser viu, LLM não)
 *   - so_llm:     blue  (LLM viu, parser não)
 *   - diff_valor: red   (valores divergem)
 *   - diff_nome:  purple (nome typo, mas valor bate)
 *   - match:      não renderizado (sem divergência)
 */
function DiffTable({ comparacao }: { comparacao: ComparacaoResultado }) {
  const divergentes = comparacao.matches.filter((m) => m.tipo !== "match");
  if (divergentes.length === 0) return null;

  return (
    <div className="mt-1 border rounded overflow-hidden text-[11px]">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-2 py-1 font-medium">Tipo</th>
            <th className="text-left px-2 py-1 font-medium">Parser</th>
            <th className="text-left px-2 py-1 font-medium">IA</th>
            <th className="text-left px-2 py-1 font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {divergentes.map((m, i) => {
            const cor =
              m.tipo === "diff_valor"
                ? "bg-red-50 dark:bg-red-950/20"
                : m.tipo === "so_parser"
                ? "bg-amber-50 dark:bg-amber-950/20"
                : m.tipo === "so_llm"
                ? "bg-sky-50 dark:bg-sky-950/20"
                : "bg-purple-50 dark:bg-purple-950/20";
            return (
              <tr key={i} className={cor}>
                <td className="px-2 py-1 font-mono uppercase">{m.tipo}</td>
                <td className="px-2 py-1">
                  {m.tipo === "so_llm"
                    ? "—"
                    : `${m.parser.nome} (R$ ${
                        m.parser.valor_vencimento ?? m.parser.valor_desconto ?? 0
                      })`}
                </td>
                <td className="px-2 py-1">
                  {m.tipo === "so_parser"
                    ? "—"
                    : `${m.llm.nome} (R$ ${
                        m.llm.valor_vencimento ?? m.llm.valor_desconto ?? 0
                      })`}
                </td>
                <td className="px-2 py-1 font-mono">
                  {m.tipo === "diff_valor"
                    ? m.delta.toFixed(2)
                    : m.tipo === "diff_nome"
                    ? `lev=${m.levenshtein}`
                    : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
