/**
 * Painel modal que mostra o `BuildReport` do construtor de CSV ANTES de
 * disparar o download. Permite ao operador ver explicitamente:
 *   - quantas linhas foram rejeitadas (perda real de dado, com motivo)
 *   - quantas linhas foram auto-corrigidas (cap de prazo, dedup, etc.)
 *   - avisos (travessia de meia-noite, overlap de faltas, etc.)
 *
 * Quando há `linhasRejeitadas.length > 0`, o botão "Baixar mesmo assim"
 * vem em vermelho e exige confirmação extra. Quando há só ajustes ou
 * warnings, o botão padrão é "Baixar".
 */
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BuildReport } from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome humano do CSV (ex: "jornada", "férias", "histórico salarial — Comissões"). */
  nomeRecurso: string;
  /** Report gerado por buildXxxWithReport. */
  report: BuildReport;
  /** Disparado quando o operador confirma. Mantém spinner enquanto resolve. */
  onConfirm: () => void | Promise<void>;
  /** True enquanto onConfirm está rodando. Bloqueia clique duplo. */
  loading?: boolean;
  /**
   * FASE 4 — quando há apurações com flag REVISAR_OCR não resolvidas
   * (admissão vazada, eventos como batidas, cronologia inválida, total
   * divergente), exige checkbox extra antes de liberar download. Texto
   * do checkbox é responsabilidade do caller (ex: "Confirmo que revisei
   * as N apurações marcadas REVISAR_OCR").
   */
  apuracoesRevisar?: number;
  /** Períodos com totalizador divergente da soma das batidas (Fase 2). */
  periodosDivergentes?: number;
}

export function CsvBuildReportPanel({
  open,
  onOpenChange,
  nomeRecurso,
  report,
  onConfirm,
  loading,
  apuracoesRevisar = 0,
  periodosDivergentes = 0,
}: Props) {
  const [confirmadoExtra, setConfirmadoExtra] = useState(false);
  // FASE 4 — gate independente para apurações REVISAR_OCR.
  const [confirmadoRevisar, setConfirmadoRevisar] = useState(false);

  const temRejeicoes = report.linhasRejeitadas.length > 0;
  const temAjustes = report.linhasAjustadas.length > 0;
  const temWarnings = report.warnings.length > 0;
  const camposNaoExportados = report.camposNaoExportados ?? [];
  const temCamposNaoExportados = camposNaoExportados.length > 0;
  const temRevisar = apuracoesRevisar > 0 || periodosDivergentes > 0;
  const limpo =
    !temRejeicoes &&
    !temAjustes &&
    !temWarnings &&
    !temCamposNaoExportados &&
    !temRevisar;

  const podeBaixar =
    (!temRejeicoes || confirmadoExtra) &&
    (!temRevisar || confirmadoRevisar);

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {limpo ? (
              <>
                <Check className="h-5 w-5 text-emerald-600" />
                Dados prontos — {nomeRecurso}
              </>
            ) : temRejeicoes ? (
              <>
                <XCircle className="h-5 w-5 text-rose-600" />
                Atenção — alguns dados de {nomeRecurso} serão descartados
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                {nomeRecurso} — revisão recomendada
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {limpo
              ? `${report.linhasGeradas} registro(s) preparados sem pendências.`
              : `Confira o resumo abaixo antes de confirmar.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-xs">
          {/* Resumo numérico */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Check className="h-3 w-3 mr-1" />
              {report.linhasGeradas} registro(s) preparados
            </Badge>
            {temRejeicoes && (
              <Badge variant="outline" className="bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200">
                <XCircle className="h-3 w-3 mr-1" />
                {report.linhasRejeitadas.length} rejeitada(s)
              </Badge>
            )}
            {temAjustes && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200">
                <Info className="h-3 w-3 mr-1" />
                {report.linhasAjustadas.length} ajuste(s)
              </Badge>
            )}
            {temWarnings && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {report.warnings.length} aviso(s)
              </Badge>
            )}
            {temCamposNaoExportados && (
              <Badge variant="outline" className="bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200">
                <Info className="h-3 w-3 mr-1" />
                {camposNaoExportados.length} campo(s) só na auditoria
              </Badge>
            )}
          </div>

          {/* Rejeições */}
          {temRejeicoes && (
            <SectionList
              titulo="Dados descartados — não serão usados no cálculo"
              tom="rose"
              items={report.linhasRejeitadas.map(
                (r) => `Linha ${r.idx + 1}: ${r.motivo}`,
              )}
            />
          )}

          {/* Ajustes */}
          {temAjustes && (
            <SectionList
              titulo="Auto-correções aplicadas"
              tom="amber"
              items={report.linhasAjustadas.map((a) =>
                a.idx >= 0 ? `Linha ${a.idx + 1}: ${a.ajuste}` : a.ajuste,
              )}
            />
          )}

          {/* Warnings */}
          {temWarnings && (
            <SectionList
              titulo="Avisos não-bloqueantes"
              tom="amber"
              items={report.warnings}
            />
          )}

          {/* Paridade — campos extraídos que não chegam ao CSV importável */}
          {temCamposNaoExportados && (
            <SectionList
              titulo="Campos disponíveis apenas nos detalhes técnicos"
              tom="sky"
              items={camposNaoExportados.map(
                (c) => `${c.campo}: ${c.motivo}`,
              )}
            />
          )}

          {temRejeicoes && (
            <div className="rounded border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 text-[11px] text-rose-900 dark:text-rose-200">
              <p className="font-medium mb-1">
                Marque a caixa abaixo para confirmar mesmo com dados descartados.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmadoExtra}
                  onChange={(e) => setConfirmadoExtra(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <span>
                  Estou ciente de que {report.linhasRejeitadas.length} registro(s) não serão usados no cálculo.
                </span>
              </label>
            </div>
          )}
          {temRevisar && (
            <div className="rounded border border-rose-400 bg-rose-100 dark:bg-rose-950/40 p-2 text-[11px] text-rose-900 dark:text-rose-200">
              <p className="font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Atenção — alguns registros precisam de conferência
              </p>
              <p className="mb-2">
                {apuracoesRevisar > 0 && (
                  <>
                    {apuracoesRevisar} registro(s) com dados inconsistentes
                    que precisam de verificação.
                    {periodosDivergentes > 0 && " "}
                  </>
                )}
                {periodosDivergentes > 0 && (
                  <>
                    {periodosDivergentes} período(s) com valores divergentes.
                  </>
                )}{" "}
                Recomenda-se revisar manualmente antes de confirmar.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmadoRevisar}
                  onChange={(e) => setConfirmadoRevisar(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <span>
                  Confirmo que revisei os registros que precisam de atenção.
                </span>
              </label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !podeBaixar}
            className={
              temRejeicoes
                ? "bg-rose-600 hover:bg-rose-700"
                : ""
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {temRejeicoes ? "Confirmar mesmo assim" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SectionList({
  titulo,
  tom,
  items,
}: {
  titulo: string;
  tom: "rose" | "amber" | "sky";
  items: string[];
}) {
  const tones = {
    rose:
      "border-rose-300 bg-rose-50/50 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200",
    amber:
      "border-amber-300 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200",
    sky:
      "border-sky-300 bg-sky-50/50 text-sky-900 dark:bg-sky-950/20 dark:text-sky-200",
  };
  return (
    <div className={`rounded border p-2 ${tones[tom]}`}>
      <div className="font-medium text-[11px] mb-1">{titulo}</div>
      <ScrollArea className="max-h-32">
        <ul className="space-y-0.5 text-[11px]">
          {items.slice(0, 50).map((item, i) => (
            <li key={i} className="leading-tight">
              · {item}
            </li>
          ))}
          {items.length > 50 && (
            <li className="opacity-70 italic">
              ...e mais {items.length - 50} item(ns)
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
