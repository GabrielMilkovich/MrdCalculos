import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { PjeCalcGrid, type PjeCalcGridColumn } from "./PjeCalcGrid";
import { useCalculoAtivo } from "./useCalculoAtivo";

interface Props {
  caseId: string;
}

interface FeriasRow {
  id: string;
  case_id?: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  situacao: string;
  prazo_dias: number;
  dobra_geral?: boolean;
  abono?: boolean;
  abono_dias?: number;
  gozo_1_inicio?: string | null;
  gozo_1_fim?: string | null;
  gozo_1_dobra?: boolean;
  gozo_2_inicio?: string | null;
  gozo_2_fim?: string | null;
  gozo_2_dobra?: boolean;
  gozo_3_inicio?: string | null;
  gozo_3_fim?: string | null;
  gozo_3_dobra?: boolean;
  observacoes?: string | null;
  documento_id?: string | null;
}

const SITUACOES = [
  { value: "gozadas", label: "Gozadas" },
  { value: "gozadas_parcialmente", label: "Goz. Parcial" },
  { value: "indenizadas", label: "Indenizadas" },
  { value: "vencidas_nao_gozadas", label: "Vencidas N/G" },
  { value: "perdidas", label: "Perdidas" },
];

export function ModuloFerias({ caseId }: Props) {
  const qc = useQueryClient();
  const { data: calculoId } = useCalculoAtivo(caseId);

  const { data: ferias = [], isLoading } = useQuery({
    queryKey: ["pjecalc_ferias", caseId, calculoId],
    enabled: !!calculoId,
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_ferias")
        .select("*")
        .eq("calculo_id", calculoId!)
        .order("periodo_aquisitivo_inicio");
      if (error) throw error;
      return (data || []) as unknown as FeriasRow[];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["pjecalc_ferias"] });

  const addFerias = async () => {
    if (!calculoId) {
      toast.error("Cálculo não disponível ainda — aguarde.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const { error } = await fromUntyped("pjecalc_ferias").insert({
      case_id: caseId,
      calculo_id: calculoId,
      periodo_aquisitivo_inicio: today,
      periodo_aquisitivo_fim: nextYear.toISOString().slice(0, 10),
      periodo_concessivo_inicio: nextYear.toISOString().slice(0, 10),
      periodo_concessivo_fim: today,
      situacao: "gozadas",
      prazo_dias: 30,
      dobra_geral: false,
      abono: false,
    });
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    invalidate();
  };

  const updateField = async (id: string, patch: Partial<FeriasRow>) => {
    const { error } = await fromUntyped("pjecalc_ferias")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    invalidate();
  };

  /** Prazo: inteiro 0..30 (PrazoDeFeriasValidRule, MSG0004). */
  const updatePrazo = (r: FeriasRow, raw: string, el: HTMLInputElement) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 30) {
      toast.error("Prazo deve ser um inteiro entre 0 e 30 dias.");
      el.value = String(r.prazo_dias);
      return;
    }
    updateField(r.id, { prazo_dias: n });
  };

  /** Dias de abono: se abono ligado, ≤ prazo/3 (DiasDeAbonoValidRule, MSG0175). */
  const updateAbonoDias = (r: FeriasRow, raw: string, el: HTMLInputElement) => {
    const n = parseInt(raw, 10) || 0;
    if (n < 0) {
      toast.error("Dias de abono não pode ser negativo.");
      el.value = String(r.abono_dias ?? 0);
      return;
    }
    if (r.abono && n > Math.floor(r.prazo_dias / 3)) {
      toast.error("Dias de abono não podem exceder 1/3 do prazo.");
      el.value = String(r.abono_dias ?? 0);
      return;
    }
    updateField(r.id, { abono_dias: n });
  };

  const removeFerias = async (r: FeriasRow) => {
    const { error } = await fromUntyped("pjecalc_ferias")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    invalidate();
  };

  const dateCell = (
    field: keyof FeriasRow,
    width = "w-28",
    nullable = false,
  ): PjeCalcGridColumn<FeriasRow> => ({
    key: field as string,
    header: field.toString().replace(/_/g, " "),
    width,
    cell: (r) => (
      <Input
        type="date"
        defaultValue={(r[field] as string | null) ?? ""}
        className="h-7 text-[11px] font-mono px-1"
        onBlur={(e) => {
          const v = e.target.value || null;
          if (v !== (r[field] ?? null)) {
            updateField(r.id, {
              [field]: nullable ? v : v ?? "",
            } as Partial<FeriasRow>);
          }
        }}
      />
    ),
  });

  const columns: PjeCalcGridColumn<FeriasRow>[] = [
    { ...dateCell("periodo_aquisitivo_inicio"), header: "Aquis. Início" },
    { ...dateCell("periodo_aquisitivo_fim"), header: "Aquis. Fim" },
    {
      key: "situacao",
      header: "Situação",
      width: "w-32",
      cell: (r) => (
        <Select
          value={r.situacao}
          onValueChange={(v) => updateField(r.id, { situacao: v })}
        >
          <SelectTrigger className="h-7 text-[11px] px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-[11px]">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "prazo_dias",
      header: "Prazo",
      align: "center",
      width: "w-16",
      cell: (r) => (
        <Input
          type="number"
          min={0}
          max={30}
          defaultValue={r.prazo_dias}
          className="h-7 text-[11px] text-center px-1"
          onBlur={(e) => updatePrazo(r, e.target.value, e.target)}
        />
      ),
    },
    {
      key: "dobra_geral",
      header: "Dobra",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={!!r.dobra_geral}
            onCheckedChange={(v) => updateField(r.id, { dobra_geral: !!v })}
          />
        </div>
      ),
    },
    {
      key: "abono",
      header: "Abono",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={!!r.abono}
            onCheckedChange={(v) => updateField(r.id, { abono: !!v })}
          />
        </div>
      ),
    },
    {
      key: "abono_dias",
      header: "Dias Abono",
      align: "center",
      width: "w-20",
      cell: (r) => (
        <Input
          type="number"
          min={0}
          max={10}
          defaultValue={r.abono_dias ?? 0}
          className="h-7 text-[11px] text-center px-1"
          onBlur={(e) => updateAbonoDias(r, e.target.value, e.target)}
        />
      ),
    },
    { ...dateCell("gozo_1_inicio", "w-28", true), header: "Gozo 1 Início" },
    { ...dateCell("gozo_1_fim", "w-28", true), header: "Gozo 1 Fim" },
    { ...dateCell("gozo_2_inicio", "w-28", true), header: "Gozo 2 Início" },
    { ...dateCell("gozo_2_fim", "w-28", true), header: "Gozo 2 Fim" },
    { ...dateCell("gozo_3_inicio", "w-28", true), header: "Gozo 3 Início" },
    { ...dateCell("gozo_3_fim", "w-28", true), header: "Gozo 3 Fim" },
  ];

  return (
    <PjeCalcGrid<FeriasRow>
      title="Férias"
      subtitle="Períodos aquisitivos, concessivos e gozos parciais."
      rows={ferias}
      rowKey={(r) => r.id}
      columns={columns}
      onAdd={addFerias}
      onDelete={removeFerias}
      addLabel="Novo Período"
      loading={isLoading}
      emptyMessage="Nenhum período de férias cadastrado. Períodos encontrados nos documentos aparecem aqui automaticamente após conferir os dados."
      rowClassName={(r) =>
        r.documento_id
          ? "bg-blue-50/60 dark:bg-blue-950/15 border-l-2 border-l-blue-400"
          : undefined
      }
    />
  );
}
