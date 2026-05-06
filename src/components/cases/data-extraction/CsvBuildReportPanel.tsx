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
}

export function CsvBuildReportPanel({
  open,
  onOpenChange,
  nomeRecurso,
  report,
  onConfirm,
  loading,
}: Props) {
  const [confirmadoExtra, setConfirmadoExtra] = useState(false);

  const temRejeicoes = report.linhasRejeitadas.length > 0;
  const temAjustes = report.linhasAjustadas.length > 0;
  const temWarnings = report.warnings.length > 0;
  const limpo = !temRejeicoes && !temAjustes && !temWarnings;

  const podeBaixar = !temRejeicoes || confirmadoExtra;

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
                CSV pronto — {nomeRecurso}
              </>
            ) : temRejeicoes ? (
              <>
                <XCircle className="h-5 w-5 text-rose-600" />
                Atenção — dados serão perdidos no CSV de {nomeRecurso}
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                CSV de {nomeRecurso} — revisão recomendada
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {limpo
              ? `${report.linhasGeradas} linha(s) saíram para o CSV sem perda nem ajuste. Pode baixar com segurança.`
              : `Resumo do que foi feito ao gerar o CSV. Confira antes de baixar.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-xs">
          {/* Resumo numérico */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Check className="h-3 w-3 mr-1" />
              {report.linhasGeradas} linha(s) no CSV
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
          </div>

          {/* Rejeições */}
          {temRejeicoes && (
            <SectionList
              titulo="Linhas REJEITADAS — não aparecem no CSV final"
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

          {temRejeicoes && (
            <div className="rounded border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 text-[11px] text-rose-900 dark:text-rose-200">
              <p className="font-medium mb-1">
                Marque a caixa abaixo para autorizar o download mesmo com perda de dado.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmadoExtra}
                  onChange={(e) => setConfirmadoExtra(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <span>
                  Estou ciente de que {report.linhasRejeitadas.length} linha(s) não entrarão no CSV. Quero baixar assim mesmo.
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
            {temRejeicoes ? "Baixar mesmo com perdas" : "Baixar"}
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
  tom: "rose" | "amber";
  items: string[];
}) {
  const tones = {
    rose:
      "border-rose-300 bg-rose-50/50 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200",
    amber:
      "border-amber-300 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200",
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
