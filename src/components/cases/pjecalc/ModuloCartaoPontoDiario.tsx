import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { PjeCalcGrid, type PjeCalcGridColumn } from "./PjeCalcGrid";

/** Limite oficial PJE-Calc: 6 pares E/S por dia. */
const MAX_PARES = 6;

/** Limite de amostragem aplicado pelo extract-and-fill legado (mantido para alerta). */
const OCR_CARTAO_PONTO_SAMPLE_LIMIT = 60;

interface Props {
  caseId: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  cargaHoraria?: number;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const OCORRENCIAS = [
  { value: "NORMAL", label: "NORMAL" },
  { value: "FALTA", label: "FALTA" },
  { value: "FERIADO", label: "FERIADO" },
  { value: "FOLGA", label: "FOLGA" },
  { value: "FERIAS", label: "FÉRIAS" },
  { value: "ATESTADO", label: "ATESTADO" },
  { value: "LICENCA_MEDICA", label: "LIC. MÉDICA" },
  { value: "DSR", label: "DSR" },
  { value: "COMPENSADO", label: "COMPENSADO" },
];

interface PontoDia {
  id: string;
  case_id: string;
  data: string;
  dia_semana: string | null;
  ocorrencia: string;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  entrada_3: string | null;
  saida_3: string | null;
  entrada_4: string | null;
  saida_4: string | null;
  entrada_5: string | null;
  saida_5: string | null;
  entrada_6: string | null;
  saida_6: string | null;
  horas_trabalhadas: number | null;
  origem: string | null;
  documento_id: string | null;
}

const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function normalizeHora(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (HORA_RE.test(v)) return v.length === 4 ? `0${v}` : v;
  // Tenta "0800" → "08:00"
  const digits = v.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (digits.length === 3) return `0${digits.slice(0, 1)}:${digits.slice(1)}`;
  return null;
}

export function ModuloCartaoPontoDiario({
  caseId,
  dataAdmissao,
  dataDemissao,
  cargaHoraria = 220,
}: Props) {
  const qc = useQueryClient();
  const [mesAtual, setMesAtual] = useState(() => {
    if (dataDemissao) return dataDemissao.slice(0, 7);
    return new Date().toISOString().slice(0, 7);
  });
  const [generating, setGenerating] = useState(false);
  const [showFixar, setShowFixar] = useState(false);
  const [jornadaFixa, setJornadaFixa] = useState({
    entrada_1: "08:00",
    saida_1: "12:00",
    entrada_2: "13:00",
    saida_2: "17:00",
    sabado: false,
  });

  const [ano, mes] = mesAtual.split("-").map(Number);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["pjecalc_ponto_diario", caseId, mesAtual],
    queryFn: async () => {
      const inicioMes = `${mesAtual}-01`;
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const fimMes = `${mesAtual}-${String(diasNoMes).padStart(2, "0")}`;
      const { data, error } = await fromUntyped("pjecalc_ponto_diario")
        .select("*")
        .eq("case_id", caseId)
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data");
      if (error) throw error;
      return (data ?? []) as unknown as PontoDia[];
    },
  });

  // Alerta de amostra OCR truncada (limite legado de 60 dias).
  const { data: ocrSampleInfo } = useQuery({
    queryKey: ["cartao_ponto_ocr_sample", caseId],
    queryFn: async () => {
      const { count } = await fromUntyped("pjecalc_apuracao_diaria")
        .select("*", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("origem", "OCR");
      const ocrCount = count || 0;
      return {
        ocrCount,
        truncated: ocrCount >= OCR_CARTAO_PONTO_SAMPLE_LIMIT,
      };
    },
    staleTime: 60_000,
  });

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: ["pjecalc_ponto_diario", caseId, mesAtual],
    });

  const resumoMes = useMemo(() => {
    let ht = 0;
    for (const r of registros) ht += Number(r.horas_trabalhadas) || 0;
    return {
      ht: ht.toFixed(2),
      dias: registros.length,
      diasTrab: registros.filter((r) => Number(r.horas_trabalhadas) > 0).length,
      faltas: registros.filter((r) => r.ocorrencia === "FALTA").length,
      feriados: registros.filter((r) => r.ocorrencia === "FERIADO").length,
    };
  }, [registros]);

  const gerarDiasMes = async () => {
    if (!dataAdmissao) {
      toast.error("Preencha a data de admissão antes.");
      return;
    }
    setGenerating(true);
    try {
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(dataAdmissao + "T00:00:00");
      const demDate = dataDemissao ? new Date(dataDemissao + "T00:00:00") : null;

      const inicioMes = `${mesAtual}-01`;
      const fimMes = `${mesAtual}-${String(diasNoMes).padStart(2, "0")}`;
      await fromUntyped("pjecalc_apuracao_diaria")
        .delete()
        .eq("case_id", caseId)
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .neq("origem", "OCR");

      const rows: Record<string, unknown>[] = [];
      for (let d = 1; d <= diasNoMes; d++) {
        const date = new Date(ano, mes - 1, d);
        if (date < admDate) continue;
        if (demDate && date > demDate) continue;
        const dow = date.getDay();
        const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(
          d,
        ).padStart(2, "0")}`;
        rows.push({
          case_id: caseId,
          data: dataStr,
          dia_semana: DIAS_SEMANA[dow],
          ocorrencia: dow === 0 ? "FOLGA" : "NORMAL",
          origem: "INFORMADA",
        });
      }
      if (rows.length > 0) {
        const { error } = await fromUntyped("pjecalc_apuracao_diaria")
          .upsert(rows, { onConflict: "case_id,data" });
        if (error) throw error;
      }
      invalidate();
      toast.success(`${rows.length} dias gerados para ${mesAtual}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const fixarJornada = async () => {
    setGenerating(true);
    try {
      for (const r of registros) {
        if (r.ocorrencia !== "NORMAL") continue;
        const dow = new Date(r.data + "T12:00:00").getDay();
        if (dow === 0) continue;
        if (dow === 6 && !jornadaFixa.sabado) continue;

        const { error } = await fromUntyped("pjecalc_apuracao_diaria")
          .update({
            entrada_1: jornadaFixa.entrada_1,
            saida_1: jornadaFixa.saida_1,
            entrada_2: jornadaFixa.entrada_2,
            saida_2: jornadaFixa.saida_2,
            entrada_3: null,
            saida_3: null,
            entrada_4: null,
            saida_4: null,
            entrada_5: null,
            saida_5: null,
            entrada_6: null,
            saida_6: null,
            origem: "FIXADA",
          })
          .eq("id", r.id);
        if (error) throw error;
      }
      invalidate();
      toast.success("Jornada fixada aplicada no mês.");
      setShowFixar(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const updateField = useCallback(
    async (id: string, field: keyof PontoDia, value: string | null) => {
      const { error } = await fromUntyped("pjecalc_apuracao_diaria")
        .update({ [field]: value, origem: "INFORMADA" })
        .eq("id", id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      invalidate();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId, mesAtual],
  );

  const addDia = async () => {
    const inicioMes = `${mesAtual}-01`;
    const existentes = new Set(registros.map((r) => r.data));
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let dia = 1;
    while (
      dia <= diasNoMes &&
      existentes.has(
        `${mesAtual}-${String(dia).padStart(2, "0")}`,
      )
    ) {
      dia += 1;
    }
    const data =
      dia <= diasNoMes
        ? `${mesAtual}-${String(dia).padStart(2, "0")}`
        : inicioMes;
    const dow = new Date(data + "T12:00:00").getDay();
    const { error } = await fromUntyped("pjecalc_apuracao_diaria")
      .upsert(
        {
          case_id: caseId,
          data,
          dia_semana: DIAS_SEMANA[dow],
          ocorrencia: "NORMAL",
          origem: "INFORMADA",
        },
        { onConflict: "case_id,data" },
      );
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    invalidate();
  };

  const removeDia = async (r: PontoDia) => {
    const { error } = await fromUntyped("pjecalc_apuracao_diaria")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    invalidate();
  };

  const navMes = (dir: number) => {
    const d = new Date(ano, mes - 1 + dir, 1);
    setMesAtual(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const mesesLabel = new Date(ano, mes - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  /** Renderiza um input HH:MM enxuto para um campo entrada_X/saida_X. */
  const horaInput = (r: PontoDia, field: keyof PontoDia) => (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="--:--"
      defaultValue={(r[field] as string | null) ?? ""}
      className="h-7 text-[11px] font-mono text-center px-1 w-[58px]"
      onBlur={(e) => {
        const v = e.target.value.trim();
        const normalized = v === "" ? null : normalizeHora(v);
        if (v !== "" && !normalized) {
          toast.error(`Hora inválida: "${v}"`);
          e.target.value = (r[field] as string | null) ?? "";
          return;
        }
        if (normalized !== (r[field] as string | null)) {
          updateField(r.id, field, normalized);
        }
      }}
    />
  );

  const columns: PjeCalcGridColumn<PontoDia>[] = [
    {
      key: "data",
      header: "Data",
      width: "w-32",
      cell: (r) => (
        <Input
          type="date"
          defaultValue={r.data}
          className="h-7 text-[11px] font-mono px-1"
          onBlur={(e) =>
            e.target.value !== r.data &&
            updateField(r.id, "data", e.target.value)
          }
        />
      ),
    },
    {
      key: "ocorrencia",
      header: "Tipo",
      width: "w-28",
      cell: (r) => (
        <Select
          value={r.ocorrencia ?? "NORMAL"}
          onValueChange={(v) => updateField(r.id, "ocorrencia", v)}
        >
          <SelectTrigger className="h-7 text-[11px] px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OCORRENCIAS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[11px]">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    // 6 pares de E/S — coluna composta (renderiza 2 inputs lado a lado)
    ...Array.from({ length: MAX_PARES }, (_, i) => {
      const idx = i + 1;
      const eField = `entrada_${idx}` as keyof PontoDia;
      const sField = `saida_${idx}` as keyof PontoDia;
      return {
        key: `par_${idx}`,
        header: `Par ${idx}`,
        align: "center" as const,
        pairColumn: true,
        cell: (r: PontoDia) => (
          <div className="flex gap-0.5 justify-center">
            {horaInput(r, eField)}
            {horaInput(r, sField)}
          </div>
        ),
      };
    }),
    {
      key: "horas",
      header: "Hs Trab.",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <span className="font-mono text-[10px] text-muted-foreground">
          {Number(r.horas_trabalhadas ?? 0).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header com navegação de mês + ações */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm capitalize min-w-[140px] text-center">
            {mesesLabel}
          </span>
          <Button variant="outline" size="sm" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={gerarDiasMes}
            disabled={generating}
            className="h-8"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Calendar className="h-3 w-3 mr-1" />
            )}
            Gerar Mês
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFixar(true)}
            className="h-8"
          >
            <Clock className="h-3 w-3 mr-1" />
            Fixar Jornada
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Dias", val: resumoMes.dias },
          { label: "Trabalhados", val: resumoMes.diasTrab },
          { label: "Hs Trab.", val: resumoMes.ht },
          { label: "Faltas", val: resumoMes.faltas },
          { label: "Feriados", val: resumoMes.feriados },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-2 text-center">
              <div className="text-[9px] text-muted-foreground uppercase">
                {item.label}
              </div>
              <div className="font-mono font-bold text-xs">{item.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ocrSampleInfo?.truncated && (
        <Card className="border-amber-400 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-200">
                Amostra de {OCR_CARTAO_PONTO_SAMPLE_LIMIT} dias detectada
              </div>
              <div className="text-amber-700 dark:text-amber-300/80">
                A extração via OCR pode ter limitado os primeiros registros.
                Verifique e complete os meses faltantes antes da liquidação.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PjeCalcGrid<PontoDia>
        title="Cartão de Ponto"
        subtitle={`Apurações diárias — layout PJE-Calc, 6 pares E/S por dia. Carga horária: ${cargaHoraria}h.`}
        rows={registros}
        rowKey={(r) => r.id}
        columns={columns}
        onAdd={addDia}
        onDelete={removeDia}
        addLabel="Adicionar Dia"
        loading={isLoading}
        emptyMessage="Nenhum dia no mês. Clique em &quot;Gerar Mês&quot; ou os dias virão automaticamente após validar um cartão de ponto via OCR."
        rowClassName={(r) => {
          const dow = new Date(r.data + "T12:00:00").getDay();
          if (r.ocorrencia === "FALTA")
            return "bg-rose-50/70 dark:bg-rose-950/15";
          if (r.ocorrencia === "FERIADO")
            return "bg-orange-50/70 dark:bg-orange-950/15";
          if (r.ocorrencia === "FERIAS")
            return "bg-sky-50/70 dark:bg-sky-950/15";
          if (r.ocorrencia === "FOLGA" || dow === 0)
            return "bg-yellow-50/40 dark:bg-yellow-950/10";
          if (r.origem === "OCR")
            return "bg-blue-50/60 dark:bg-blue-950/15 border-l-2 border-l-blue-400";
          if (r.origem === "FIXADA")
            return "bg-emerald-50/50 dark:bg-emerald-950/10";
          if (dow === 6) return "bg-slate-50/50 dark:bg-slate-900/20";
          return undefined;
        }}
      />

      {/* Dialog Fixar Jornada */}
      <Dialog open={showFixar} onOpenChange={setShowFixar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixar Jornada no Mês</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Aplica os horários informados uniformemente a todos os dias úteis
            do mês visualizado.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entrada 1</Label>
              <Input
                type="time"
                value={jornadaFixa.entrada_1}
                onChange={(e) =>
                  setJornadaFixa((p) => ({ ...p, entrada_1: e.target.value }))
                }
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Saída 1</Label>
              <Input
                type="time"
                value={jornadaFixa.saida_1}
                onChange={(e) =>
                  setJornadaFixa((p) => ({ ...p, saida_1: e.target.value }))
                }
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Entrada 2 (volta intervalo)</Label>
              <Input
                type="time"
                value={jornadaFixa.entrada_2}
                onChange={(e) =>
                  setJornadaFixa((p) => ({ ...p, entrada_2: e.target.value }))
                }
                className="mt-1 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Saída 2</Label>
              <Input
                type="time"
                value={jornadaFixa.saida_2}
                onChange={(e) =>
                  setJornadaFixa((p) => ({ ...p, saida_2: e.target.value }))
                }
                className="mt-1 h-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              checked={jornadaFixa.sabado}
              onCheckedChange={(v) =>
                setJornadaFixa((p) => ({ ...p, sabado: !!v }))
              }
            />
            <Label className="text-xs">Incluir sábados</Label>
          </div>
          <DialogFooter>
            <Button onClick={fixarJornada} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Aplicar no Mês
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
