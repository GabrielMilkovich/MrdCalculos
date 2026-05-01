/**
 * FeriasReviewDialog — revisão visual + edição dos períodos de férias
 * antes de baixar o CSV de Férias do PJe-Calc.
 *
 * Permite editar relativa, prazo, situação, dobra, abono, dias de abono e
 * os 3 gozos. Adicionar/remover período manual.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewLayout } from "./ReviewLayout";
import {
  buildFeriasCSVBlob,
  triggerBlobDownload,
  type FeriasParseada,
  type GozoPeriodo,
  type ParseFeriasResult,
  type SituacaoFerias,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseFeriasResult;
  ocrText: string;
  filename: string;
}

const SITUACOES: Array<{ value: SituacaoFerias; label: string }> = [
  { value: "G", label: "Gozadas" },
  { value: "GP", label: "Gozadas Parcialmente" },
  { value: "NG", label: "Não Gozadas" },
  { value: "I", label: "Indenizadas" },
  { value: "P", label: "Perdidas" },
];

type Row = FeriasParseada & { _key: string };

function newKey(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function FeriasReviewDialog({
  open,
  onOpenChange,
  parsed,
  ocrText,
  filename,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    setRows(parsed.ferias.map((f) => ({ ...f, _key: newKey() })));
  }, [parsed]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.relativa.localeCompare(b.relativa)),
    [rows],
  );

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const updateGozo = (
    key: string,
    field: "gozo1" | "gozo2" | "gozo3",
    patch: Partial<GozoPeriodo> | null,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (patch === null) return { ...r, [field]: null };
        const cur =
          r[field] ?? ({ inicio: "", fim: "", dobra: false } as GozoPeriodo);
        return { ...r, [field]: { ...cur, ...patch } };
      }),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        relativa: "",
        prazo: 30,
        situacao: "NG",
        dobra_geral: false,
        abono: false,
        dias_abono: 0,
        gozo1: null,
        gozo2: null,
        gozo3: null,
        _key: newKey(),
      },
    ]);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const unparsedLines = parsed.unparsed_lines.map((u) => u.linha);

  const handleConfirm = async () => {
    const ferias: FeriasParseada[] = sorted
      .filter((r) => r.relativa.match(/^\d{4}\/\d{4}$/))
      .map((r) => ({
        relativa: r.relativa,
        prazo: r.prazo,
        situacao: r.situacao,
        dobra_geral: r.dobra_geral,
        abono: r.abono,
        dias_abono: r.dias_abono,
        gozo1: r.gozo1,
        gozo2: r.gozo2,
        gozo3: r.gozo3,
      }));
    const blob = buildFeriasCSVBlob({
      ferias,
      warnings: [],
      unparsed_lines: [],
    });
    triggerBlobDownload(blob, filename);
  };

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar férias"
      subtitle={`${rows.length} período(s) · ${filename}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      warnings={parsed.warnings}
      contadores={{ extraidos: rows.length, etiqueta: "período" }}
      onConfirm={handleConfirm}
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
        <span className="text-[11px] text-muted-foreground">
          Edite/adicione períodos. Relativa precisa estar em "aaaa/aaaa".
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Período
        </Button>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground text-center">
          Nenhum período de férias — clique em "Período" para adicionar.
        </div>
      ) : (
        <div className="divide-y">
          {sorted.map((r) => (
            <FeriasRow
              key={r._key}
              row={r}
              onUpdate={(patch) => updateRow(r._key, patch)}
              onUpdateGozo={(field, patch) => updateGozo(r._key, field, patch)}
              onRemove={() => removeRow(r._key)}
            />
          ))}
        </div>
      )}
    </ReviewLayout>
  );
}

function FeriasRow({
  row,
  onUpdate,
  onUpdateGozo,
  onRemove,
}: {
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onUpdateGozo: (
    field: "gozo1" | "gozo2" | "gozo3",
    patch: Partial<GozoPeriodo> | null,
  ) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center gap-1.5">
        <Input
          placeholder="2023/2024"
          value={row.relativa}
          onChange={(e) => onUpdate({ relativa: e.target.value })}
          className="h-7 text-[11px] font-mono w-[100px]"
        />
        <Input
          type="number"
          min={0}
          max={60}
          value={row.prazo}
          onChange={(e) => onUpdate({ prazo: parseInt(e.target.value, 10) || 0 })}
          className="h-7 text-[11px] w-[60px]"
        />
        <Select
          value={row.situacao}
          onValueChange={(v) => onUpdate({ situacao: v as SituacaoFerias })}
        >
          <SelectTrigger className="h-7 text-[11px] w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-[11px] ml-2">
          <Checkbox
            checked={row.dobra_geral}
            onCheckedChange={(v) => onUpdate({ dobra_geral: Boolean(v) })}
          />
          <span>Dobra</span>
        </label>
        <label className="flex items-center gap-1 text-[11px]">
          <Checkbox
            checked={row.abono}
            onCheckedChange={(v) => onUpdate({ abono: Boolean(v) })}
          />
          <span>Abono</span>
        </label>
        {row.abono && (
          <Input
            type="number"
            min={0}
            max={20}
            value={row.dias_abono}
            onChange={(e) =>
              onUpdate({ dias_abono: parseInt(e.target.value, 10) || 0 })
            }
            className="h-7 text-[11px] w-[55px]"
            placeholder="dias"
          />
        )}
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
      <div className="space-y-1">
        {(["gozo1", "gozo2", "gozo3"] as const).map((field, idx) => {
          const g = row[field];
          return (
            <div key={field} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground w-[60px]">
                Gozo {idx + 1}
              </span>
              <Input
                placeholder="dd/mm/aaaa"
                value={g?.inicio ?? ""}
                onChange={(e) => onUpdateGozo(field, { inicio: e.target.value })}
                className="h-7 text-[11px] font-mono w-[110px]"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                placeholder="dd/mm/aaaa"
                value={g?.fim ?? ""}
                onChange={(e) => onUpdateGozo(field, { fim: e.target.value })}
                className="h-7 text-[11px] font-mono w-[110px]"
              />
              <label className="flex items-center gap-1 ml-1">
                <Checkbox
                  checked={!!g?.dobra}
                  disabled={!g}
                  onCheckedChange={(v) =>
                    g && onUpdateGozo(field, { dobra: Boolean(v) })
                  }
                />
                <span>Dobra</span>
              </label>
              {g && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onUpdateGozo(field, null)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
