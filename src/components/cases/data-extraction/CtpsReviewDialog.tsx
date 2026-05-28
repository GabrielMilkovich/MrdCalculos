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
import { Calendar, ClipboardX, Download, ExternalLink, FileText, Loader2 } from "lucide-react";
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
import { DetalhesTecnicos } from "./DetalhesTecnicos";
import { FeriasReviewDialog } from "./FeriasReviewDialog";
import { FaltasReviewDialog } from "./FaltasReviewDialog";
import {
  type AIInteractionResult,
} from "./VerifyExtractionAIButton";
import { VerifyParityForenseButton } from "./VerifyParityForenseButton";
import { useDocumentPdfUrl } from "./hooks/useDocumentPdfUrl";
import { toast } from "sonner";
import { validarCtps } from "@/features/data-extraction/validators/ctps-validator";
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
  /**
   * Quando presente (Ficha de Anotações ADP-Web/SAP processada via V2),
   * o ZIP final contém 4 CSVs (dados_contratuais + historico_salarial
   * + historico_ferias + registro_faltas). Quando ausente, builder legacy
   * gera apenas 2 CSVs (ferias + faltas). UI de revisão é a mesma — os
   * dados de tabs Férias/Faltas vêm do mesmo shape FeriasParseada/FaltaParseada.
   */
  ctpsV2?: import('@/domain/tipos-dominio').CtpsDominioV2;
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
  ctpsV2,
  ocrText,
  baseFilename,
  filename,
  documentId,
}: Props) {
  const pdfUrl = useDocumentPdfUrl(documentId, open);
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

  const ctpsValidacao = useMemo(
    () => validarCtps(feriasParsed.ferias, faltasParsed.faltas),
    [feriasParsed.ferias, faltasParsed.faltas],
  );

  // FASE 1.5 — qualquer um dos dois sub-componentes (férias/faltas)
  // bloqueia o CTPS. Não permite parcial.
  const bloqueadorCtps =
    confidenceFerias.bloqueador === true || confidenceFaltas.bloqueador === true;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, report } = await buildCtpsZipWithReport({
        ferias: feriasParsed,
        faltas: faltasParsed,
        baseFilename,
        ctpsV2,
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
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Conferir carteira de trabalho
              </DialogTitle>
              <div className="flex items-center gap-1">
                {pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                    title="Abre o PDF original em uma nova aba do navegador"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir PDF
                  </Button>
                )}
                <VerifyParityForenseButton
                  documentId={documentId}
                  builder="ctps"
                  parsed={{ ferias: feriasParsed, faltas: faltasParsed }}
                  pdfDisponivel={!!documentId}
                />
              </div>
            </div>
            <DialogDescription className="text-xs">
              Dados encontrados: <strong>{feriasParsed.ferias.length}</strong> período(s) de férias e <strong>{faltasParsed.faltas.length}</strong> registro(s) de faltas.
              Revise cada aba antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {/* FASE 1.5 — banner de ATENÇÃO (não bloqueia download).
              Decisão de produto: operador SEMPRE decide se baixa. */}
          {bloqueadorCtps && (
            <div className="border-2 border-red-400 bg-red-50 dark:bg-red-950/30 rounded p-3 text-sm space-y-1">
              <div className="font-bold text-red-900 dark:text-red-100">
                Atenção — alguns dados precisam de conferência
              </div>
              <div className="text-red-800 dark:text-red-200 text-xs">
                Revise os períodos de férias e faltas antes de confirmar.
                Foram encontradas inconsistências que precisam de verificação.
              </div>
            </div>
          )}

          {!ctpsValidacao.ok && (
            <div className="border border-amber-300 bg-amber-50 rounded p-2 text-xs space-y-1">
              <div className="font-medium text-amber-900">
                Validação CTPS: {ctpsValidacao.resumo.violacoes_criticas} crítica(s), {ctpsValidacao.resumo.violacoes_altas} alta(s)
              </div>
              {ctpsValidacao.violacoes.slice(0, 3).map((v, i) => (
                <div key={i} className="text-amber-800">
                  [{v.severidade}] {v.descricao}
                </div>
              ))}
              {ctpsValidacao.violacoes.length > 3 && (
                <div className="text-amber-600">
                  +{ctpsValidacao.violacoes.length - 3} violação(ões)
                </div>
              )}
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
              <SecaoResumo
                titulo="Férias"
                qtd={feriasParsed.ferias.length}
                etiqueta="período(s)"
                onEditar={() => setFeriasOpen(true)}
                vazio={
                  feriasParsed.ferias.length === 0
                    ? "Nenhum período de férias detectado neste documento. Se houver férias registradas, adicione manualmente."
                    : null
                }
              />
            </TabsContent>

            <TabsContent value="faltas" className="flex-1 min-h-0 mt-3 space-y-2">
              <SecaoResumo
                titulo="Faltas"
                qtd={faltasParsed.faltas.length}
                etiqueta="registro(s)"
                onEditar={() => setFaltasOpen(true)}
                vazio={
                  faltasParsed.faltas.length === 0
                    ? "Nenhuma falta detectada neste documento. Se houver faltas registradas, adicione manualmente."
                    : null
                }
              />
            </TabsContent>
          </Tabs>

          <DetalhesTecnicos
            items={[
              { label: "Confiança (férias)", value: `${confidenceFerias.score}/100` },
              { label: "Confiança (faltas)", value: `${confidenceFaltas.score}/100` },
              ...(feriasParsed.warnings.length > 0 ? [{ label: "Observações férias", value: feriasParsed.warnings.length }] : []),
              ...(faltasParsed.warnings.length > 0 ? [{ label: "Observações faltas", value: faltasParsed.warnings.length }] : []),
            ]}
          >
            {(feriasParsed.warnings.length > 0 || faltasParsed.warnings.length > 0) && (
              <div className="text-xs space-y-1">
                {feriasParsed.warnings.map((w, i) => (
                  <p key={`f-${i}`} className="text-muted-foreground">· {w}</p>
                ))}
                {faltasParsed.warnings.map((w, i) => (
                  <p key={`a-${i}`} className="text-muted-foreground">· {w}</p>
                ))}
              </div>
            )}
          </DetalhesTecnicos>

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
                  faltasParsed.faltas.length === 0)
              }
              className="gap-1.5"
              title="Confirmar os dados deste documento"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Confirmar documento
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
            <AlertDialogTitle>Confirme antes de continuar</AlertDialogTitle>
            <AlertDialogDescription>
              Verifique os dados de férias e faltas antes de confirmar.
              Estes dados serão usados no cálculo.
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
                <strong>Férias conferidas</strong> — datas, situação e
                abono conferem com o documento original.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm select-none cursor-pointer">
              <Checkbox
                checked={conferiu2}
                onCheckedChange={(v) => setConferiu2(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                <strong>Faltas conferidas</strong> — datas e justificativas
                conferem com o documento original.
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
                    Revisei os dados que precisam de atenção
                  </strong>{" "}
                  e confirmo que estão corretos.
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
              Confirmar
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
          {qtd} {etiqueta} {qtd === 1 ? "encontrado" : "encontrados"}
        </p>
        {vazio && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
            {vazio}
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onEditar}>
        Conferir
      </Button>
    </div>
  );
}

function ListaAvisos({ itens }: { itens: string[] }) {
  return (
    <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-xs space-y-0.5">
      <p className="font-medium text-amber-900 dark:text-amber-100">
        Observações
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
