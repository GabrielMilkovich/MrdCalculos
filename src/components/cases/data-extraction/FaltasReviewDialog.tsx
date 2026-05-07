/**
 * FaltasReviewDialog — revisão visual + edição das faltas antes de baixar
 * o CSV de Faltas do PJe-Calc.
 *
 * Permite editar período (data início + fim), justificada, reinicia
 * período aquisitivo, justificativa. Adicionar/remover.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ReviewLayout } from "./ReviewLayout";
import {
  buildFaltasCSVBlobWithReport,
  logCsvExport,
  scoreFaltas,
  triggerBlobDownload,
  type BuildReport,
  type FaltaParseada,
  type ParseFaltasResult,
} from "@/features/data-extraction";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import {
  VerifyExtractionAIButton,
  type AIInteractionResult,
  type AISuggestion,
} from "./VerifyExtractionAIButton";
import { useKeyboardNavigation } from "./useKeyboardNavigation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseFaltasResult;
  ocrText: string;
  filename: string;
  documentId?: string;
}

type Row = FaltaParseada & { _key: string };

function newKey(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function FaltasReviewDialog({
  open,
  onOpenChange,
  parsed,
  ocrText,
  filename,
  documentId: _documentId,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const effectiveParsed = parsed;

  useEffect(() => {
    setRows(effectiveParsed.faltas.map((f) => ({ ...f, _key: newKey() })));
  }, [effectiveParsed]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
    [rows],
  );

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        data_inicio: "",
        data_fim: "",
        justificada: false,
        reiniciar_periodo_aquisitivo: false,
        justificativa: null,
        _key: newKey(),
      },
    ]);

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const unparsedLines = effectiveParsed.unparsed_lines.map((u) => u.linha);

  const [reportPreview, setReportPreview] = useState<{
    blob: Blob;
    report: BuildReport;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  // F0.4 — propaga checkbox override do ReviewLayout até logCsvExport.
  const [bloqueioBurladoFlag, setBloqueioBurladoFlag] = useState(false);
  // PR-2 — telemetria IA propagada do VerifyExtractionAIButton até logCsvExport.
  const [aiTelemetry, setAiTelemetry] = useState<AIInteractionResult | null>(
    null,
  );

  /**
   * Aplica sugestões da IA. Suporta:
   *   - faltas[N].data_inicio / data_fim (string ISO)
   *   - faltas[N].justificativa (string)
   * Outros campos ignorados.
   */
  function handleAISuggestions(suggestions: AISuggestion[]): void {
    setRows((prev) => {
      const next = [...prev];
      for (const s of suggestions) {
        const m = s.field.match(/^faltas\[(\d+)\]\.(data_inicio|data_fim|justificativa)$/);
        if (!m) continue;
        const i = parseInt(m[1], 10);
        const campo = m[2] as "data_inicio" | "data_fim" | "justificativa";
        if (!next[i]) continue;
        if (campo === "justificativa") {
          if (s.suggested === null || typeof s.suggested === "string") {
            next[i] = { ...next[i], justificativa: s.suggested };
          }
        } else if (typeof s.suggested === "string") {
          next[i] = { ...next[i], [campo]: s.suggested };
        }
      }
      return next;
    });
  }

  const handleConfirm = async (opts?: { bloqueioBurlado: boolean }) => {
    setBloqueioBurladoFlag(opts?.bloqueioBurlado ?? false);
    const faltas: FaltaParseada[] = sorted
      .filter(
        (r) =>
          /^\d{4}-\d{2}-\d{2}$/.test(r.data_inicio) &&
          /^\d{4}-\d{2}-\d{2}$/.test(r.data_fim),
      )
      .map((r) => ({
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        justificada: r.justificada,
        reiniciar_periodo_aquisitivo: r.reiniciar_periodo_aquisitivo,
        justificativa: r.justificativa,
      }));
    const { blob, report } = buildFaltasCSVBlobWithReport({
      faltas,
      warnings: [],
      unparsed_lines: [],
    });
    setReportPreview({ blob, report });
  };

  const handleDownloadConfirmed = async () => {
    if (!reportPreview) return;
    setDownloading(true);
    try {
      triggerBlobDownload(reportPreview.blob, filename);
      void logCsvExport({
        builder: "faltas",
        report: reportPreview.report,
        documentId: _documentId ?? null,
        baixadoComPerdas: reportPreview.report.linhasRejeitadas.length > 0,
        bloqueioBurlado: bloqueioBurladoFlag,
        parserOrigem: "regex_v5_faltas",
        aiInvoked: aiTelemetry?.aiInvoked ?? false,
        aiChangedFields: aiTelemetry?.aiChangedFields ?? [],
        aiConfidence: aiTelemetry?.aiConfidence ?? undefined,
        aiSkippedReason: aiTelemetry?.aiSkippedReason ?? undefined,
      });
      setReportPreview(null);
      setBloqueioBurladoFlag(false);
      onOpenChange(false);
    } finally {
      setDownloading(false);
    }
  };

  const confidence = useMemo(
    () => scoreFaltas(effectiveParsed, ocrText),
    [effectiveParsed, ocrText],
  );

  // Atalhos J/K — pula entre faltas com data inválida ou intervalo invertido.
  useKeyboardNavigation({
    enabled: open,
    selector: "[data-row-key]",
    isProblema: (idx) => {
      const r = sorted[idx];
      if (!r) return false;
      const iniOk = /^\d{4}-\d{2}-\d{2}$/.test(r.data_inicio);
      const fimOk = /^\d{4}-\d{2}-\d{2}$/.test(r.data_fim);
      if (!iniOk || !fimOk) return true;
      return r.data_inicio > r.data_fim;
    },
  });

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar faltas"
      subtitle={`${rows.length} ocorrência(s) · ${filename}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      warnings={effectiveParsed.warnings}
      contadores={{ extraidos: rows.length, etiqueta: "falta" }}
      headerSlot={
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge score={confidence} />
          <VerifyExtractionAIButton
            score={confidence.score}
            builder="faltas"
            documentId={_documentId ?? null}
            parsed={{
              faltas: sorted.map((r) => ({
                data_inicio: r.data_inicio,
                data_fim: r.data_fim,
                justificada: r.justificada,
                reiniciar_periodo_aquisitivo: r.reiniciar_periodo_aquisitivo,
                justificativa: r.justificativa,
              })),
              warnings: effectiveParsed.warnings,
            }}
            ocrText={ocrText ?? ""}
            onApplySuggestions={handleAISuggestions}
            onTelemetry={setAiTelemetry}
          />
        </div>
      }
      onConfirm={handleConfirm}
      divergenciasCount={
        unparsedLines.length + (effectiveParsed.warnings?.length ?? 0)
      }
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
        <span className="text-[11px] text-muted-foreground">
          Edite/adicione faltas. Datas em dd/mm/aaaa serão aceitas.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Falta
        </Button>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground text-center">
          Nenhuma falta — clique em "Falta" para adicionar manualmente.
        </div>
      ) : (
        <div className="divide-y">
          {sorted.map((r) => (
            <FaltaRow
              key={r._key}
              dataRowKey={r._key}
              row={r}
              onUpdate={(patch) => updateRow(r._key, patch)}
              onRemove={() => removeRow(r._key)}
            />
          ))}
        </div>
      )}
      <CsvBuildReportPanel
        open={!!reportPreview}
        onOpenChange={(o) => {
          if (!o && !downloading) setReportPreview(null);
        }}
        nomeRecurso="registro de faltas"
        report={reportPreview?.report ?? { linhasGeradas: 0, linhasRejeitadas: [], linhasAjustadas: [], warnings: [] }}
        onConfirm={handleDownloadConfirmed}
        loading={downloading}
      />
    </ReviewLayout>
  );
}

function FaltaRow({
  row,
  onUpdate,
  onRemove,
  dataRowKey,
}: {
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
  dataRowKey?: string;
}) {
  return (
    <div className="p-2 space-y-1.5 transition-shadow" data-row-key={dataRowKey}>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground w-[40px]">De</span>
        <Input
          type="date"
          value={row.data_inicio}
          onChange={(e) => onUpdate({ data_inicio: e.target.value })}
          className="h-7 text-[11px] font-mono w-[140px]"
        />
        <span className="text-[11px] text-muted-foreground">até</span>
        <Input
          type="date"
          value={row.data_fim}
          onChange={(e) => onUpdate({ data_fim: e.target.value })}
          className="h-7 text-[11px] font-mono w-[140px]"
        />
        <label className="flex items-center gap-1 text-[11px] ml-2">
          <Checkbox
            checked={row.justificada}
            onCheckedChange={(v) => onUpdate({ justificada: Boolean(v) })}
          />
          <span>Justificada</span>
        </label>
        <label className="flex items-center gap-1 text-[11px]">
          <Checkbox
            checked={row.reiniciar_periodo_aquisitivo}
            onCheckedChange={(v) =>
              onUpdate({ reiniciar_periodo_aquisitivo: Boolean(v) })
            }
          />
          <span>Reinicia período</span>
        </label>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        rows={2}
        placeholder="Justificativa (opcional, máx 200 chars)"
        value={row.justificativa ?? ""}
        onChange={(e) =>
          onUpdate({
            justificativa: e.target.value || null,
          })
        }
        className="text-[11px] resize-none"
        maxLength={200}
      />
    </div>
  );
}
