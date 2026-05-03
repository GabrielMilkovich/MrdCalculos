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
  scoreFerias,
  triggerBlobDownload,
  type FeriasParseada,
  type GozoPeriodo,
  type ParseFeriasResult,
  type SituacaoFerias,
} from "@/features/data-extraction";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AICopilotBanner } from "./AICopilotBanner";
import { useAICopilot } from "./useAICopilot";
import { useKeyboardNavigation } from "./useKeyboardNavigation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseFeriasResult;
  ocrText: string;
  filename: string;
  documentId?: string;
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

const RE_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Valida data dd/MM/yyyy considerando dias por mês e ano bissexto. */
function isDataBRValida(s: string): boolean {
  const m = s.match(RE_DATA_BR);
  if (!m) return false;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return dia <= ultimoDia;
}

/** Converte dd/MM/yyyy → Date (00:00 local). */
function dataBRToDate(s: string): Date | null {
  if (!isDataBRValida(s)) return null;
  const m = s.match(RE_DATA_BR)!;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/** Erros por linha de férias (chave = `_key`). */
type RowErrors = {
  relativa?: string;
  prazo?: string;
  gozos?: string;
  /** Erros pontuais por gozo. */
  gozoCampos?: Partial<Record<"gozo1" | "gozo2" | "gozo3", { inicio?: boolean; fim?: boolean }>>;
};

function validateRow(r: Row): RowErrors {
  const errs: RowErrors = {};
  if (!/^\d{4}\/\d{4}$/.test(r.relativa)) {
    errs.relativa = "Relativa precisa estar em aaaa/aaaa.";
  }
  if (r.prazo < 0 || r.prazo > 60) {
    errs.prazo = "Prazo deve estar entre 0 e 60 dias.";
  }
  const gozoCampos: NonNullable<RowErrors["gozoCampos"]> = {};
  const intervalos: Array<{ ini: Date; fim: Date }> = [];
  for (const field of ["gozo1", "gozo2", "gozo3"] as const) {
    const g = r[field];
    if (!g) continue;
    const iniOk = isDataBRValida(g.inicio);
    const fimOk = isDataBRValida(g.fim);
    if (!iniOk || !fimOk) {
      gozoCampos[field] = { inicio: !iniOk, fim: !fimOk };
      continue;
    }
    const ini = dataBRToDate(g.inicio)!;
    const fim = dataBRToDate(g.fim)!;
    if (fim < ini) {
      gozoCampos[field] = { inicio: true, fim: true };
      continue;
    }
    intervalos.push({ ini, fim });
  }
  // Detecta sobreposição de gozos.
  for (let i = 0; i < intervalos.length; i++) {
    for (let j = i + 1; j < intervalos.length; j++) {
      const a = intervalos[i];
      const b = intervalos[j];
      if (a.ini <= b.fim && b.ini <= a.fim) {
        errs.gozos = "Períodos de gozo sobrepostos.";
      }
    }
  }
  if (Object.keys(gozoCampos).length > 0) errs.gozoCampos = gozoCampos;
  return errs;
}

function rowHasErrors(e: RowErrors): boolean {
  return !!(e.relativa || e.prazo || e.gozos || (e.gozoCampos && Object.keys(e.gozoCampos).length > 0));
}

export function FeriasReviewDialog({
  open,
  onOpenChange,
  parsed,
  ocrText,
  filename,
  documentId,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const copilot = useAICopilot({
    tipo: "recibo_ferias",
    documentId: documentId ?? null,
    ocrText,
    parsed,
    enabled: !!documentId,
  });
  const effectiveParsed = copilot.effective;

  useEffect(() => {
    setRows(effectiveParsed.ferias.map((f) => ({ ...f, _key: newKey() })));
  }, [effectiveParsed]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.relativa.localeCompare(b.relativa)),
    [rows],
  );

  const errosPorLinha = useMemo(() => {
    const map = new Map<string, RowErrors>();
    for (const r of sorted) map.set(r._key, validateRow(r));
    return map;
  }, [sorted]);

  const totalErros = useMemo(
    () => Array.from(errosPorLinha.values()).filter(rowHasErrors).length,
    [errosPorLinha],
  );

  const confidence = copilot.effectiveScore;

  // Atalhos J/K — pula entre períodos com erro (relativa/datas/overlap).
  useKeyboardNavigation({
    enabled: open,
    selector: "[data-row-key]",
    isProblema: (idx) => {
      const r = sorted[idx];
      if (!r) return false;
      return rowHasErrors(errosPorLinha.get(r._key) ?? {});
    },
  });

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

  const unparsedLines = effectiveParsed.unparsed_lines.map((u) => u.linha);

  const handleConfirm = async () => {
    const ferias: FeriasParseada[] = sorted
      .filter((r) => !rowHasErrors(errosPorLinha.get(r._key) ?? {}))
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
      warnings={effectiveParsed.warnings}
      contadores={{ extraidos: rows.length, etiqueta: "período" }}
      headerSlot={
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge score={confidence} />
          <AICopilotBanner
            loading={copilot.loading}
            loadingDeep={copilot.loadingDeep}
            erro={copilot.erro}
            regexScore={copilot.regexScore}
            iaScore={copilot.iaScore}
            reconciliacao={copilot.reconciliacao}
            modo={copilot.modo}
            onModoChange={copilot.setModo}
            onRunDeep={documentId ? () => void copilot.runDeep() : undefined}
          />
        </div>
      }
      onConfirm={handleConfirm}
      confirmDisabled={totalErros > 0}
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
        <span className="text-[11px] text-muted-foreground">
          Edite/adicione períodos. Relativa em "aaaa/aaaa", datas em "dd/mm/aaaa".
          {totalErros > 0 && (
            <span className="ml-2 text-destructive font-medium">
              {totalErros} período(s) com erro — corrija antes de baixar.
            </span>
          )}
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
              dataRowKey={r._key}
              row={r}
              errors={errosPorLinha.get(r._key) ?? {}}
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
  errors,
  onUpdate,
  onUpdateGozo,
  onRemove,
  dataRowKey,
}: {
  row: Row;
  errors: RowErrors;
  onUpdate: (patch: Partial<Row>) => void;
  onUpdateGozo: (
    field: "gozo1" | "gozo2" | "gozo3",
    patch: Partial<GozoPeriodo> | null,
  ) => void;
  onRemove: () => void;
  dataRowKey?: string;
}) {
  const errClass = "border-destructive ring-1 ring-destructive/40";
  return (
    <div className="p-2 space-y-2 transition-shadow" data-row-key={dataRowKey}>
      <div className="flex items-center gap-1.5">
        <Input
          placeholder="2023/2024"
          value={row.relativa}
          onChange={(e) => onUpdate({ relativa: e.target.value })}
          className={`h-7 text-[11px] font-mono w-[100px] ${errors.relativa ? errClass : ""}`}
          title={errors.relativa}
        />
        <Input
          type="number"
          min={0}
          max={60}
          value={row.prazo}
          onChange={(e) =>
            onUpdate({
              prazo: parseInt(e.target.value, 10) || 0,
              // Edição manual sai do default — confiamos no usuário.
              prazo_origem: "detectado",
            })
          }
          className={`h-7 text-[11px] w-[60px] ${
            errors.prazo
              ? errClass
              : row.prazo_origem === "default"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                : row.prazo_origem === "ajustado"
                  ? "border-amber-300"
                  : ""
          }`}
          title={
            errors.prazo ??
            (row.prazo_origem === "default"
              ? "Prazo NÃO foi detectado no recibo — assumido 30 dias (CLT 130). Confirme antes de baixar."
              : row.prazo_origem === "ajustado"
                ? "Prazo foi ajustado pelo parser (cap 60 dias do PJe-Calc). Confira."
                : undefined)
          }
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
          const gErr = errors.gozoCampos?.[field];
          return (
            <div key={field} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground w-[60px]">
                Gozo {idx + 1}
              </span>
              <Input
                placeholder="dd/mm/aaaa"
                value={g?.inicio ?? ""}
                onChange={(e) => onUpdateGozo(field, { inicio: e.target.value })}
                className={`h-7 text-[11px] font-mono w-[110px] ${gErr?.inicio ? errClass : ""}`}
                title={gErr?.inicio ? "Data inválida (use dd/mm/aaaa)" : undefined}
              />
              <span className="text-muted-foreground">a</span>
              <Input
                placeholder="dd/mm/aaaa"
                value={g?.fim ?? ""}
                onChange={(e) => onUpdateGozo(field, { fim: e.target.value })}
                className={`h-7 text-[11px] font-mono w-[110px] ${gErr?.fim ? errClass : ""}`}
                title={gErr?.fim ? "Data inválida ou anterior ao início" : undefined}
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
        {errors.gozos && (
          <div className="text-[10px] text-destructive pl-[68px]">
            ⚠ {errors.gozos}
          </div>
        )}
      </div>
    </div>
  );
}
