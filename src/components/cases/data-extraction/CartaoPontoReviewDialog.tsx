/**
 * CartaoPontoReviewDialog — revisão visual + edição da jornada antes de
 * baixar o CSV "Importar Jornada" do PJe-Calc.
 *
 * Recursos:
 *   - Lê texto OCR + ApuracaoDiaria[] do parser.
 *   - Tabela editável: data, ocorrência, 6 pares E/S por dia.
 *   - Adicionar/remover linha.
 *   - Linhas do OCR não casadas ficam em amarelo no painel de referência.
 *   - Checkbox "conferi" obrigatório para liberar download.
 */
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewLayout } from "./ReviewLayout";
import {
  buildCartaoPontoCSV,
  triggerBlobDownload,
  type ApuracaoDiaria,
  type EventoDiario,
  type Marcacao,
  type OcorrenciaApuracao,
  type ParseCartaoPontoResult,
} from "@/features/data-extraction";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parsed: ParseCartaoPontoResult;
  ocrText: string;
  filename: string;
}

const OCORRENCIAS: OcorrenciaApuracao[] = [
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
];

type Row = ApuracaoDiaria & { _key: string };

function newKey(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fillMarcacoes(marcs: Marcacao[]): Marcacao[] {
  const out: Marcacao[] = [...marcs];
  while (out.length < 6) out.push({ e: "", s: "" });
  return out.slice(0, 6);
}

function trimMarcacoes(marcs: Marcacao[]): Marcacao[] {
  return marcs.filter((m) => m.e || m.s);
}

export function CartaoPontoReviewDialog({
  open,
  onOpenChange,
  parsed,
  ocrText,
  filename,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  // Inicializa quando o parsed mudar
  useEffect(() => {
    setRows(
      parsed.apuracoes.map((a) => ({
        ...a,
        marcacoes: fillMarcacoes(a.marcacoes),
        _key: newKey(),
      })),
    );
  }, [parsed]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "")),
    [rows],
  );

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const updateMarcacao = (
    key: string,
    idx: number,
    field: "e" | "s",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const next = [...r.marcacoes];
        next[idx] = { ...next[idx], [field]: value };
        return { ...r, marcacoes: next };
      }),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        data: prev[prev.length - 1]?.data ?? "",
        dia_semana: null,
        ocorrencia: "NORMAL",
        marcacoes: fillMarcacoes([]),
        eventos: [],
        observacao: null,
        _key: newKey(),
      },
    ]);
  };

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const unparsedLines = parsed.unparsed_lines.map((u) => u.linha);
  const warnings = parsed.warnings;

  const handleConfirm = async () => {
    // Limpa marcações vazias antes de gerar CSV
    const apuracoes: ApuracaoDiaria[] = sorted
      .filter((r) => r.data) // descarta linhas sem data
      .map((r) => ({
        data: r.data,
        dia_semana: r.dia_semana ?? null,
        ocorrencia: r.ocorrencia,
        marcacoes:
          r.ocorrencia === "NORMAL" ? trimMarcacoes(r.marcacoes) : [],
        eventos: r.eventos ?? [],
        observacao: r.observacao,
      }));
    const blob = buildCartaoPontoCSV({
      apuracoes,
      competencias: new Map(),
      competencia_predominante: parsed.competencia_predominante,
      data_inicial: apuracoes[0]?.data ?? "",
      data_final: apuracoes[apuracoes.length - 1]?.data ?? "",
      warnings: [],
      unparsed_lines: [],
    });
    triggerBlobDownload(blob, filename);
  };

  return (
    <ReviewLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Revisar jornada — Cartão de Ponto"
      subtitle={`Competência ${parsed.competencia_predominante || "—"} · ${filename}`}
      ocrText={ocrText}
      unparsedLines={unparsedLines}
      warnings={warnings}
      contadores={{ extraidos: rows.length, etiqueta: "apuração" }}
      onConfirm={handleConfirm}
    >
      <div className="p-2 flex items-center justify-between border-b sticky top-0 bg-background z-10">
        <span className="text-[11px] text-muted-foreground">
          Edite/adicione linhas conforme o OCR. Linhas amarelas no OCR (lado
          esquerdo) precisam virar uma linha aqui.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addRow}
        >
          <Plus className="h-3 w-3" /> Dia
        </Button>
      </div>
      {sorted.length === 0 ? (
        <div className="p-6 text-xs text-muted-foreground text-center">
          Nenhuma apuração — clique em "Dia" para adicionar manualmente.
        </div>
      ) : (
        <Table>
          <TableHeader className="sticky top-[42px] bg-background z-10">
            <TableRow>
              <TableHead className="w-[120px] text-[10px]">Data</TableHead>
              <TableHead className="w-[110px] text-[10px]">Ocorrência</TableHead>
              <TableHead className="text-[10px] text-center" colSpan={6}>
                3 pares E/S (E1 S1 E2 S2 E3 S3) — adicione mais com edição
              </TableHead>
              <TableHead className="w-[140px] text-[10px]">Eventos</TableHead>
              <TableHead className="w-[40px] text-[10px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r._key} className="text-xs">
                <TableCell className="p-1">
                  <Input
                    type="date"
                    value={r.data}
                    onChange={(e) => updateRow(r._key, { data: e.target.value })}
                    className="h-7 text-[11px] font-mono"
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Select
                    value={r.ocorrencia}
                    onValueChange={(v) =>
                      updateRow(r._key, {
                        ocorrencia: v as OcorrenciaApuracao,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OCORRENCIAS.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <TableCell key={`pair-${idx}`} className="p-1" colSpan={2}>
                    <div className="flex gap-0.5">
                      <Input
                        placeholder={idx === 0 ? "08:00" : ""}
                        value={r.marcacoes[idx]?.e ?? ""}
                        onChange={(e) =>
                          updateMarcacao(r._key, idx, "e", e.target.value)
                        }
                        title={
                          r.marcacoes[idx]?.e_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-7 text-[11px] font-mono w-[55px] px-1.5 ${
                          r.marcacoes[idx]?.e_inserida
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}
                        disabled={r.ocorrencia !== "NORMAL"}
                      />
                      <Input
                        placeholder={idx === 0 ? "12:00" : ""}
                        value={r.marcacoes[idx]?.s ?? ""}
                        onChange={(e) =>
                          updateMarcacao(r._key, idx, "s", e.target.value)
                        }
                        title={
                          r.marcacoes[idx]?.s_inserida
                            ? "Batida inserida manualmente (asterisco no OCR)"
                            : ""
                        }
                        className={`h-7 text-[11px] font-mono w-[55px] px-1.5 ${
                          r.marcacoes[idx]?.s_inserida
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                            : ""
                        }`}
                        disabled={r.ocorrencia !== "NORMAL"}
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="p-1">
                  <EventosBadges eventos={r.eventos ?? []} />
                </TableCell>
                <TableCell className="p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(r._key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ReviewLayout>
  );
}

// =====================================================
// Badges de eventos jurídicos preservados
// =====================================================

const EVENTO_LABEL: Record<string, { label: string; tone: string }> = {
  horas_trabalhadas: { label: "HT", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200" },
  horas_previstas: { label: "HP", tone: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200" },
  banco_horas_debito: { label: "BH-", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
  banco_horas_70: { label: "BH+70%", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" },
  he_com_70: { label: "HE 70%", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
  he_intervalo: { label: "HE Interv.", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
  he_feriado_0: { label: "HE Feriado", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200" },
  rsr_trabalhado_0: { label: "RSR-Trab.", tone: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-200" },
  intrajornada_sup_2hs: { label: "Intra+2h", tone: "bg-pink-100 text-pink-800 dark:bg-pink-950/30 dark:text-pink-200" },
  feriado_dias: { label: "Feriado", tone: "bg-orange-100 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200" },
  dsr_semanal_dias: { label: "DSR", tone: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200" },
  ferias: { label: "Férias", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200" },
  licenca_medica: { label: "Lic. Méd.", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
  treinamento: { label: "Trein.", tone: "bg-violet-100 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200" },
};

function EventosBadges({ eventos }: { eventos: EventoDiario[] }) {
  if (!eventos || eventos.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-0.5">
      {eventos.map((ev, i) => {
        const meta = EVENTO_LABEL[ev.tipo] ?? {
          label: ev.tipo,
          tone: "bg-muted text-muted-foreground",
        };
        return (
          <Badge
            key={i}
            variant="outline"
            className={`text-[9px] font-normal ${meta.tone} border-transparent`}
            title={`${ev.tipo}: ${ev.valor} (preservado do OCR)`}
          >
            {meta.label} {ev.valor}
          </Badge>
        );
      })}
    </div>
  );
}
