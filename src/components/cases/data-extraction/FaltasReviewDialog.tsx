/**
 * FaltasReviewDialog — revisão visual + edição das faltas antes de baixar
 * o CSV de Faltas do PJe-Calc.
 *
 * Permite editar período (data início + fim), justificada, reinicia
 * período aquisitivo, justificativa. Adicionar/remover.
 */
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { CsvBuildReportPanel } from "./CsvBuildReportPanel";
import {
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
        tipo_afastamento: "falta_simples" as const,
        duracao_dias: 0,
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
      title="Conferir faltas"
      subtitle={`${rows.length} ocorrência(s) · ${filename}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      warnings={effectiveParsed.warnings}
      contadores={{ extraidos: rows.length, etiqueta: "falta" }}
      bloqueador={confidence.bloqueador === true}
      bloqueadorReasons={confidence.reasons}
      headerSlot={undefined}
      onConfirm={handleConfirm}
      divergenciasCount={
        unparsedLines.length + (effectiveParsed.warnings?.length ?? 0)
      }
      bloqueador={confidence.bloqueador}
      bloqueadorMotivo={confidence.bloqueador_motivo}
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
        <span className="text-[11px] text-muted-foreground">
          {sorted.length} registro(s). Clique em "Editar" para alterar.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Adicionar falta
        </Button>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground text-center">
          Nenhuma falta — clique em "Adicionar falta" acima.
        </div>
      ) : (
        <FaltasTable
          rows={sorted}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
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

function FaltasTable({
  rows,
  onUpdate,
  onRemove,
}: {
  rows: Row[];
  onUpdate: (key: string, patch: Partial<Row>) => void;
  onRemove: (key: string) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const TIPO_LABELS: Record<string, string> = {
    falta_simples: 'Falta',
    atestado: 'Atestado',
    aux_doenca: 'Aux. doença',
    licenca_maternidade: 'Lic. maternidade',
    licenca_paternidade: 'Lic. paternidade',
    licenca_medica: 'Lic. médica',
    suspensao: 'Suspensão',
    outros: 'Outros',
  };

  function tipoLabel(tipo: string | undefined): string {
    if (!tipo) return 'Falta';
    return TIPO_LABELS[tipo] ?? tipo;
  }

  function formatDate(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0">
        <TableRow>
          <TableHead className="text-[10px] w-[140px]">Período</TableHead>
          <TableHead className="text-[10px]">Tipo</TableHead>
          <TableHead className="text-[10px] w-[80px] text-center">Reinicia?</TableHead>
          <TableHead className="text-[10px] w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const isEditing = editandoId === r._key;
          const iniOk = /^\d{4}-\d{2}-\d{2}$/.test(r.data_inicio);
          const fimOk = /^\d{4}-\d{2}-\d{2}$/.test(r.data_fim);
          const dateInvalid = (!iniOk || !fimOk || r.data_inicio > r.data_fim);

          return isEditing ? (
            <TableRow key={r._key} className="bg-muted/40" data-row-key={r._key}>
              <TableCell colSpan={4} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-[24px]">De:</span>
                    <Input
                      type="date"
                      value={r.data_inicio}
                      onChange={(e) => onUpdate(r._key, { data_inicio: e.target.value })}
                      className={`h-7 text-[11px] font-mono w-[150px] ${dateInvalid ? "border-rose-400" : ""}`}
                    />
                    <span className="text-[11px] text-muted-foreground">até</span>
                    <Input
                      type="date"
                      value={r.data_fim}
                      onChange={(e) => onUpdate(r._key, { data_fim: e.target.value })}
                      className={`h-7 text-[11px] font-mono w-[150px] ${dateInvalid ? "border-rose-400" : ""}`}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <Checkbox
                        checked={r.justificada}
                        onCheckedChange={(v) => onUpdate(r._key, { justificada: Boolean(v) })}
                      />
                      Justificada
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px]">
                      <Checkbox
                        checked={r.reiniciar_periodo_aquisitivo}
                        onCheckedChange={(v) => onUpdate(r._key, { reiniciar_periodo_aquisitivo: Boolean(v) })}
                      />
                      Reinicia período aquisitivo
                    </label>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Justificativa (opcional, máx 200 chars)"
                    value={r.justificativa ?? ""}
                    onChange={(e) => onUpdate(r._key, { justificativa: e.target.value || null })}
                    className="text-[11px] resize-none"
                    maxLength={200}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => { onRemove(r._key); setEditandoId(null); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditandoId(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow
              key={r._key}
              className={`text-xs ${dateInvalid ? "bg-rose-50/50 dark:bg-rose-950/10" : ""}`}
              data-row-key={r._key}
            >
              <TableCell className="py-1.5 font-mono text-[11px]">
                {formatDate(r.data_inicio)}
                {r.data_inicio !== r.data_fim && <> – {formatDate(r.data_fim)}</>}
              </TableCell>
              <TableCell className="py-1.5">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {tipoLabel(r.tipo_afastamento)}
                </Badge>
                {r.justificada && (
                  <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">Just.</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 text-center text-[11px]">
                {r.reiniciar_periodo_aquisitivo ? "Sim" : "Não"}
              </TableCell>
              <TableCell className="py-1.5 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setEditandoId(r._key)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
