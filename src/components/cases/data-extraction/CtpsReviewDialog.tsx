/**
 * CtpsReviewDialog — revisão da CTPS (Carteira de Trabalho).
 *
 * Diferente dos outros 4 dialogs, a CTPS NÃO é 1 tipo de extração isolado:
 * é um documento que contém tanto recibo de férias QUANTO registro de
 * faltas no mesmo OCR. O pipeline `ctps` roda os 2 parsers sobre o mesmo
 * texto e este dialog apresenta os 2 resultados em ABAS distintas, cada
 * uma com tabela editável + sub-OCR de referência.
 *
 * Reutiliza `FeriasReviewDialog` e `FaltasReviewDialog` em conteúdo de
 * tabs (sem o gate de download deles — o gate é único aqui no fim).
 *
 * Confirmação: 1 download = 1 ZIP com 2 CSVs (ferias + faltas) + LEIA-ME.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ClipboardX,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import { FeriasReviewDialog } from "./FeriasReviewDialog";
import { FaltasReviewDialog } from "./FaltasReviewDialog";
import {
  VerifyExtractionAIButton,
  type AIInteractionResult,
} from "./VerifyExtractionAIButton";
import { toast } from "sonner";
import {
  buildCtpsZipWithReport,
  logCsvExport,
  scoreFaltas,
  scoreFerias,
  triggerBlobDownload,
  type BuildReport,
  type ParseFaltasResult,
  type ParseFeriasResult,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feriasParsed: ParseFeriasResult;
  faltasParsed: ParseFaltasResult;
  ocrText: string;
  baseFilename: string;
  filename: string;
  documentId?: string;
}

export function CtpsReviewDialog({
  open,
  onOpenChange,
  feriasParsed,
  faltasParsed,
  ocrText,
  baseFilename,
  filename,
  documentId,
}: Props) {
  const [tab, setTab] = useState<"ferias" | "faltas">("ferias");
  const [feriasOpen, setFeriasOpen] = useState(false);
  const [faltasOpen, setFaltasOpen] = useState(false);
  const [confirmacaoOpen, setConfirmacaoOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [conferiu1, setConferiu1] = useState(false);
  const [conferiu2, setConferiu2] = useState(false);
  // F0.4 — checkbox override exigido quando há divergências sinalizadas
  // por qualquer dos parsers (férias ou faltas).
  const [conferiuDivergencias, setConferiuDivergencias] = useState(false);
  const divergenciasCount =
    (feriasParsed.warnings?.length ?? 0) +
    (feriasParsed.unparsed_lines?.length ?? 0) +
    (faltasParsed.warnings?.length ?? 0) +
    (faltasParsed.unparsed_lines?.length ?? 0);
  const exigeOverride = divergenciasCount > 0;
  const conferido =
    conferiu1 && conferiu2 && (!exigeOverride || conferiuDivergencias);

  useEffect(() => {
    if (!confirmacaoOpen) {
      setConferiu1(false);
      setConferiu2(false);
      setConferiuDivergencias(false);
    }
  }, [confirmacaoOpen]);

  const [reportPreview, setReportPreview] = useState<{
    blob: Blob;
    report: BuildReport;
  } | null>(null);

  // PR-2 — telemetria IA. Cada aba tem seu próprio botão (builder=ferias
  // ou builder=faltas) e a telemetria final agregada vai pra logCsvExport
  // como builder=ctps. Sugestões IA não persistem no parsed das tabs (o
  // dialog principal é read-only); operador deve usar o sub-dialog
  // "Editar" pra aplicar manualmente. Telemetria continua sendo registrada.
  const [aiTelemetryFerias, setAiTelemetryFerias] =
    useState<AIInteractionResult | null>(null);
  const [aiTelemetryFaltas, setAiTelemetryFaltas] =
    useState<AIInteractionResult | null>(null);

  const confidenceFerias = useMemo(
    () => scoreFerias(feriasParsed, ocrText),
    [feriasParsed, ocrText],
  );
  const confidenceFaltas = useMemo(
    () => scoreFaltas(faltasParsed, ocrText),
    [faltasParsed, ocrText],
  );

  // F0.5 — bloqueio agregado: se qualquer sub-score bloqueia, CTPS bloqueia.
  const bloqueador =
    confidenceFerias.bloqueador || confidenceFaltas.bloqueador;
  const bloqueadorMotivo =
    confidenceFerias.bloqueador_motivo ?? confidenceFaltas.bloqueador_motivo;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, report } = await buildCtpsZipWithReport({
        ferias: feriasParsed,
        faltas: faltasParsed,
        baseFilename,
      });
      setReportPreview({ blob, report });
      setConfirmacaoOpen(false);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadConfirmed = async () => {
    if (!reportPreview) return;
    setDownloading(true);
    try {
      triggerBlobDownload(reportPreview.blob, filename);
      // Telemetria IA agregada: invoked se qualquer aba foi clicada;
      // confidence média entre as duas (quando disponível); changed_fields
      // concatenados com prefixo. Mantém `builder=ctps` no log porque é o
      // download CTPS, mesmo que cada chamada IA por aba use builder próprio.
      const aiInvoked =
        (aiTelemetryFerias?.aiInvoked ?? false) ||
        (aiTelemetryFaltas?.aiInvoked ?? false);
      const confidences = [
        aiTelemetryFerias?.aiConfidence,
        aiTelemetryFaltas?.aiConfidence,
      ].filter((c): c is number => typeof c === "number");
      const aiConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : undefined;
      const aiChangedFields = [
        ...(aiTelemetryFerias?.aiChangedFields ?? []).map((f) => `ferias:${f}`),
        ...(aiTelemetryFaltas?.aiChangedFields ?? []).map((f) => `faltas:${f}`),
      ];
      const skipReasons = [
        aiTelemetryFerias?.aiSkippedReason
          ? `ferias: ${aiTelemetryFerias.aiSkippedReason}`
          : null,
        aiTelemetryFaltas?.aiSkippedReason
          ? `faltas: ${aiTelemetryFaltas.aiSkippedReason}`
          : null,
      ].filter((s): s is string => s !== null);

      void logCsvExport({
        builder: "ctps",
        report: reportPreview.report,
        documentId: documentId ?? null,
        baixadoComPerdas: reportPreview.report.linhasRejeitadas.length > 0,
        bloqueioBurlado: exigeOverride && conferiuDivergencias,
        parserOrigem: "regex_v5_ctps",
        aiInvoked,
        aiChangedFields,
        aiConfidence,
        aiSkippedReason: skipReasons.length > 0 ? skipReasons.join(" | ") : undefined,
      });
      setReportPreview(null);
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Revisar CTPS — Carteira de Trabalho
            </DialogTitle>
            <DialogDescription className="text-xs">
              Este documento contém <strong>férias</strong> e <strong>faltas</strong>{" "}
              no mesmo OCR. Revise cada aba separadamente. O download gera 1 ZIP
              com os 2 CSVs.
            </DialogDescription>
          </DialogHeader>

          {bloqueador && (
            <div
              role="alert"
              className="border border-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded p-2 text-xs space-y-0.5"
            >
              <div className="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-100">
                <AlertTriangle className="h-3.5 w-3.5" /> Download bloqueado —{" "}
                {bloqueadorMotivo ?? "inconsistência grave detectada."}
              </div>
              <p className="text-[11px] text-rose-900/80 dark:text-rose-100/80">
                Re-execute o OCR no documento original ou corrija manualmente os
                dados marcados em vermelho antes de baixar. Este bloqueio não
                pode ser sobrescrito.
              </p>
            </div>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "ferias" | "faltas")}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="ferias" className="gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Férias
                <Badge variant="secondary" className="text-[10px]">
                  {feriasParsed.ferias.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="faltas" className="gap-2">
                <ClipboardX className="h-3.5 w-3.5" />
                Faltas
                <Badge variant="secondary" className="text-[10px]">
                  {faltasParsed.faltas.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ferias" className="flex-1 min-h-0 mt-3 space-y-2">
              <div className="flex items-center justify-end">
                <VerifyExtractionAIButton
                  score={confidenceFerias.score}
                  builder="ferias"
                  documentId={documentId ?? null}
                  parsed={{
                    ferias: feriasParsed.ferias,
                    warnings: feriasParsed.warnings,
                  }}
                  ocrText={ocrText ?? ""}
                  onApplySuggestions={() => {
                    toast.info(
                      "Sugestões de IA recebidas. Abra 'Editar' nesta aba para aplicar manualmente — o dialog CTPS é só leitura.",
                    );
                  }}
                  onTelemetry={setAiTelemetryFerias}
                />
              </div>
              <SecaoResumo
                titulo="Férias parseadas neste documento"
                qtd={feriasParsed.ferias.length}
                etiqueta="período(s)"
                onEditar={() => setFeriasOpen(true)}
                vazio={
                  feriasParsed.ferias.length === 0
                    ? "Nenhum período de férias detectado no OCR. Se você espera férias aqui, abra a edição e adicione manualmente."
                    : null
                }
              />
              {feriasParsed.warnings.length > 0 && (
                <ListaAvisos itens={feriasParsed.warnings} />
              )}
            </TabsContent>

            <TabsContent value="faltas" className="flex-1 min-h-0 mt-3 space-y-2">
              <div className="flex items-center justify-end">
                <VerifyExtractionAIButton
                  score={confidenceFaltas.score}
                  builder="faltas"
                  documentId={documentId ?? null}
                  parsed={{
                    faltas: faltasParsed.faltas,
                    warnings: faltasParsed.warnings,
                  }}
                  ocrText={ocrText ?? ""}
                  onApplySuggestions={() => {
                    toast.info(
                      "Sugestões de IA recebidas. Abra 'Editar' nesta aba para aplicar manualmente — o dialog CTPS é só leitura.",
                    );
                  }}
                  onTelemetry={setAiTelemetryFaltas}
                />
              </div>
              <SecaoResumo
                titulo="Faltas parseadas neste documento"
                qtd={faltasParsed.faltas.length}
                etiqueta="registro(s)"
                onEditar={() => setFaltasOpen(true)}
                vazio={
                  faltasParsed.faltas.length === 0
                    ? "Nenhuma falta detectada no OCR. Se você espera faltas aqui, abra a edição e adicione manualmente."
                    : null
                }
              />
              {faltasParsed.warnings.length > 0 && (
                <ListaAvisos itens={faltasParsed.warnings} />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={downloading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmacaoOpen(true)}
              disabled={
                downloading ||
                (feriasParsed.ferias.length === 0 &&
                  faltasParsed.faltas.length === 0) ||
                bloqueador === true
              }
              className="gap-1.5"
              title={
                bloqueador
                  ? `Download bloqueado: ${bloqueadorMotivo ?? "inconsistência grave"}`
                  : "Abre o gate de confirmação antes do download do ZIP"
              }
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Confirmar e baixar ZIP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs reutilizando a UI completa de cada tipo */}
      {feriasOpen && (
        <FeriasReviewDialog
          open={feriasOpen}
          onOpenChange={setFeriasOpen}
          parsed={feriasParsed}
          ocrText={ocrText}
          filename={`${baseFilename}_ferias.csv`}
          documentId={documentId}
        />
      )}
      {faltasOpen && (
        <FaltasReviewDialog
          open={faltasOpen}
          onOpenChange={setFaltasOpen}
          parsed={faltasParsed}
          ocrText={ocrText}
          filename={`${baseFilename}_faltas.csv`}
          documentId={documentId}
        />
      )}

      {/* Gate de confirmação reduzido — 2 itens dirigidos para CTPS */}
      <AlertDialog open={confirmacaoOpen} onOpenChange={setConfirmacaoOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirme antes de baixar</AlertDialogTitle>
            <AlertDialogDescription>
              O ZIP terá os 2 CSVs (férias e faltas) + LEIA-ME com as
              instruções de importação no PJe-Calc.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiu1}
                onCheckedChange={(v) => setConferiu1(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Férias revisadas</strong> — datas dos gozos, prazo,
                situação (G/GP/NG/I/P) e abono pecuniário conferem com a CTPS.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiu2}
                onCheckedChange={(v) => setConferiu2(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Faltas revisadas</strong> — datas, justificada/injustificada
                e justificativas conferem com as anotações na CTPS.
              </span>
            </label>
            {exigeOverride && (
              <label className="flex items-start gap-3 text-sm select-none cursor-pointer border-t pt-3 border-amber-200 dark:border-amber-800">
                <Checkbox
                  checked={conferiuDivergencias}
                  onCheckedChange={(v) => setConferiuDivergencias(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  <strong className="text-amber-900 dark:text-amber-100">
                    Confirmo que revisei manualmente cada divergência acima
                  </strong>{" "}
                  ({divergenciasCount} sinalizada
                  {divergenciasCount === 1 ? "" : "s"} pelos parsers). O download
                  será registrado como <em>bloqueio burlado</em> na telemetria
                  para audit trail jurídico.
                </span>
              </label>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={downloading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (conferido && !downloading) void handleDownload();
              }}
              disabled={!conferido || downloading}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Baixar ZIP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CsvBuildReportPanel
        open={!!reportPreview}
        onOpenChange={(o) => {
          if (!o && !downloading) setReportPreview(null);
        }}
        nomeRecurso="CTPS (férias + faltas)"
        report={reportPreview?.report ?? { linhasGeradas: 0, linhasRejeitadas: [], linhasAjustadas: [], warnings: [] }}
        onConfirm={handleDownloadConfirmed}
        loading={downloading}
      />
    </>
  );
}

function SecaoResumo({
  titulo,
  qtd,
  etiqueta,
  onEditar,
  vazio,
}: {
  titulo: string;
  qtd: number;
  etiqueta: string;
  onEditar: () => void;
  vazio: string | null;
}) {
  return (
    <div className="border rounded-md p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {qtd} {etiqueta} {qtd === 1 ? "extraído" : "extraídos"}
        </p>
        {vazio && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
            {vazio}
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onEditar}>
        Editar / revisar
      </Button>
    </div>
  );
}

function ListaAvisos({ itens }: { itens: string[] }) {
  return (
    <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-0.5">
      <p className="font-medium text-amber-900 dark:text-amber-100">
        Avisos do parser
      </p>
      {itens.slice(0, 5).map((w, i) => (
        <p key={i} className="text-amber-800 dark:text-amber-200">
          · {w}
        </p>
      ))}
      {itens.length > 5 && (
        <p className="text-[10px] text-amber-700">
          ...e mais {itens.length - 5} aviso(s).
        </p>
      )}
    </div>
  );
}
