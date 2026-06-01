import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { PjeCalcGrid, type PjeCalcGridColumn } from "./PjeCalcGrid";
import { useCalculoAtivo } from "./useCalculoAtivo";
import { detectarOverlapFalta, periodosCoincidem } from "./falta-schema";

interface Props {
  caseId: string;
}

interface FaltaRow {
  id: string;
  case_id?: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  reiniciar_ferias?: boolean;
  motivo?: string | null;
  documento_id?: string | null;
}

export function ModuloFaltas({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: calculoId } = useCalculoAtivo(caseId);

  const { data: faltas = [], isLoading } = useQuery({
    queryKey: ["pjecalc_faltas", caseId, calculoId],
    enabled: !!calculoId,
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_faltas")
        .select("*")
        .eq("calculo_id", calculoId!)
        .order("data_inicial");
      if (error) throw error;
      return (data || []) as unknown as FaltaRow[];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["pjecalc_faltas"] });

  const addFalta = async () => {
    if (!calculoId) {
      toast.error("Cálculo não disponível ainda — aguarde.");
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await fromUntyped("pjecalc_faltas").insert({
        case_id: caseId,
        calculo_id: calculoId,
        data_inicial: today,
        data_final: today,
        justificada: false,
        reiniciar_ferias: false,
        motivo: "",
      });
      if (error) throw error;
      invalidate();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = async (id: string, patch: Partial<FaltaRow>) => {
    const { error } = await fromUntyped("pjecalc_faltas")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    invalidate();
  };

  /**
   * Atualiza uma data com validação de paridade (Falta.validar):
   * término ≥ inicial e sem sobreposição com outras faltas (MSG0024).
   * Em caso de violação, reverte o input e avisa, sem persistir.
   */
  const updateDate = (
    row: FaltaRow,
    campo: "data_inicial" | "data_final",
    novoValor: string,
    inputEl: HTMLInputElement,
  ) => {
    const candidata = { ...row, [campo]: novoValor };
    if (candidata.data_inicial && candidata.data_final && candidata.data_final < candidata.data_inicial) {
      toast.error("Data final não pode ser anterior à data inicial.");
      inputEl.value = row[campo];
      return;
    }
    const conflito = detectarOverlapFalta(candidata, faltas);
    if (conflito) {
      toast.error("Período coincide com outra falta já registrada (datas coincidentes).");
      inputEl.value = row[campo];
      return;
    }
    updateField(row.id, { [campo]: novoValor });
  };

  const removeFalta = async (row: FaltaRow) => {
    const { error } = await fromUntyped("pjecalc_faltas")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    invalidate();
  };

  const columns: PjeCalcGridColumn<FaltaRow>[] = [
    {
      key: "data_inicial",
      header: "Data Inicial",
      width: "w-32",
      cell: (r) => (
        <Input
          type="date"
          defaultValue={r.data_inicial}
          className="h-7 text-[11px] font-mono px-1"
          onBlur={(e) =>
            e.target.value !== r.data_inicial &&
            updateDate(r, "data_inicial", e.target.value, e.target)
          }
        />
      ),
    },
    {
      key: "data_final",
      header: "Data Final",
      width: "w-32",
      cell: (r) => (
        <Input
          type="date"
          defaultValue={r.data_final}
          className="h-7 text-[11px] font-mono px-1"
          onBlur={(e) =>
            e.target.value !== r.data_final &&
            updateDate(r, "data_final", e.target.value, e.target)
          }
        />
      ),
    },
    {
      key: "justificada",
      header: "Justificada",
      align: "center",
      width: "w-20",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={!!r.justificada}
            onCheckedChange={(v) =>
              updateField(r.id, { justificada: !!v })
            }
          />
        </div>
      ),
    },
    {
      key: "reiniciar_ferias",
      header: "Reinicia Férias",
      align: "center",
      width: "w-24",
      cell: (r) => (
        <div
          className="flex justify-center"
          title="Art. 130-A CLT: faltas que reiniciam o período aquisitivo a partir da data de retorno."
        >
          <Checkbox
            checked={!!r.reiniciar_ferias}
            onCheckedChange={(v) =>
              updateField(r.id, { reiniciar_ferias: !!v })
            }
          />
        </div>
      ),
    },
    {
      key: "motivo",
      header: "Motivo / Justificativa",
      cell: (r) => (
        <Input
          defaultValue={r.motivo ?? ""}
          placeholder="Ex: Atestado médico"
          className="h-7 text-[11px] px-1.5"
          onBlur={(e) =>
            (e.target.value || null) !== r.motivo &&
            updateField(r.id, { motivo: e.target.value || null })
          }
        />
      ),
    },
  ];

  return (
    <PjeCalcGrid<FaltaRow>
      title="Faltas"
      subtitle="Registros de faltas do empregado. Não justificadas reduzem o prazo de férias (Art. 130 CLT)."
      rows={faltas}
      rowKey={(r) => r.id}
      columns={columns}
      onAdd={addFalta}
      onDelete={removeFalta}
      addLabel={saving ? "Adicionando..." : "Nova Falta"}
      loading={isLoading}
      emptyMessage="Nenhuma falta registrada. As faltas extraídas dos documentos via OCR aparecem aqui automaticamente após confirmar a validação."
      rowClassName={(r) =>
        r.documento_id
          ? "bg-blue-50/60 dark:bg-blue-950/15 border-l-2 border-l-blue-400"
          : undefined
      }
    />
  );
}
