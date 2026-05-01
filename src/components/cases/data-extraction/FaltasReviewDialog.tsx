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
  buildFaltasCSVBlob,
  triggerBlobDownload,
  type FaltaParseada,
  type ParseFaltasResult,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseFaltasResult;
  ocrText: string;
  filename: string;
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
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    setRows(parsed.faltas.map((f) => ({ ...f, _key: newKey() })));
  }, [parsed]);

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

  const unparsedLines = parsed.unparsed_lines.map((u) => u.linha);

  const handleConfirm = async () => {
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
    const blob = buildFaltasCSVBlob({
      faltas,
      warnings: [],
      unparsed_lines: [],
    });
    triggerBlobDownload(blob, filename);
  };

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar faltas"
      subtitle={`${rows.length} ocorrência(s) · ${filename}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      warnings={parsed.warnings}
      contadores={{ extraidos: rows.length, etiqueta: "falta" }}
      onConfirm={handleConfirm}
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
              row={r}
              onUpdate={(patch) => updateRow(r._key, patch)}
              onRemove={() => removeRow(r._key)}
            />
          ))}
        </div>
      )}
    </ReviewLayout>
  );
}

function FaltaRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-2 space-y-1.5">
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
