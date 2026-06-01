import { useMemo } from "react";
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
import { ImportadorFichaFinanceira } from "./ImportadorFichaFinanceira";
import { useCalculoAtivo } from "./useCalculoAtivo";
import { toMoneyNumber, isValidMoney } from "@/lib/pjecalc/money";

interface Props {
  caseId: string;
}

// Tabela base (não view): pjecalc_hist_salarial
interface HistoricoBase {
  id: string;
  calculo_id: string | null;
  case_id: string | null;
  nome: string;
  tipo_variacao: string | null;
  incide_inss: boolean | null;
  incide_fgts: boolean | null;
  incide_ir: boolean | null;
  valor_fixo: number | null;
  observacoes: string | null;
}

// Tabela base (não view): pjecalc_hist_salarial_mes
interface OcorrenciaBase {
  id: string;
  calculo_id: string | null;
  case_id: string | null;
  hist_salarial_id: string | null;
  competencia: string; // DATE yyyy-mm-dd
  valor: number;
  origem: string | null;
  documento_id: string | null;
}

interface GridRow {
  ocorrenciaId: string;
  historicoId: string;
  competencia: string; // "yyyy-MM" (para input type=month)
  nomeRubrica: string;
  tipoVariacao: string;
  valor: number;
  origem: string | null;
  documento_id: string | null;
  incide_inss: boolean;
  incide_fgts: boolean;
  incide_ir: boolean;
}

const TIPOS_VARIACAO = [
  { value: "FIXA", label: "Fixa" },
  { value: "VARIAVEL", label: "Variável" },
  { value: "INFORMADA", label: "Informada" },
];

export function ModuloHistoricoSalarial({ caseId }: Props) {
  const qc = useQueryClient();
  const { data: calculoId } = useCalculoAtivo(caseId);

  const { data: historicos = [], isLoading: loadingH } = useQuery({
    queryKey: ["pjecalc_historico", calculoId],
    enabled: !!calculoId,
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_hist_salarial")
        .select("*")
        .eq("calculo_id", calculoId!)
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as HistoricoBase[];
    },
  });

  const { data: ocorrencias = [], isLoading: loadingO } = useQuery({
    queryKey: ["pjecalc_historico_ocorrencias", calculoId],
    enabled: !!calculoId,
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_hist_salarial_mes")
        .select("*")
        .eq("calculo_id", calculoId!)
        .order("competencia");
      if (error) throw error;
      return (data || []) as unknown as OcorrenciaBase[];
    },
  });

  const histById = useMemo(() => {
    const m = new Map<string, HistoricoBase>();
    for (const h of historicos) m.set(h.id, h);
    return m;
  }, [historicos]);

  const rows: GridRow[] = useMemo(() => {
    return ocorrencias.map((o) => {
      const h = o.hist_salarial_id ? histById.get(o.hist_salarial_id) : undefined;
      return {
        ocorrenciaId: o.id,
        historicoId: o.hist_salarial_id ?? "",
        competencia: (o.competencia ?? "").slice(0, 7),
        nomeRubrica: h?.nome ?? "—",
        tipoVariacao: h?.tipo_variacao ?? "VARIAVEL",
        valor: Number(o.valor) || 0,
        origem: o.origem,
        documento_id: o.documento_id,
        incide_inss: !!h?.incide_inss,
        incide_fgts: !!h?.incide_fgts,
        incide_ir: h?.incide_ir !== false,
      };
    });
  }, [ocorrencias, histById]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pjecalc_historico"] });
    qc.invalidateQueries({ queryKey: ["pjecalc_historico_ocorrencias"] });
  };

  /** Garante a existência da rubrica-mãe pelo nome; cria se não houver. */
  const ensureHistorico = async (nome: string): Promise<string> => {
    if (!calculoId) throw new Error("Cálculo não disponível.");
    const nomeNorm = nome.toUpperCase().trim() || "BASE";
    for (const h of historicos) {
      if (h.nome.toUpperCase().trim() === nomeNorm) return h.id;
    }
    const { data, error } = await fromUntyped("pjecalc_hist_salarial")
      .insert({
        calculo_id: calculoId,
        case_id: caseId,
        nome: nome || "Base",
        tipo_variacao: "VARIAVEL",
        incide_fgts: true,
        incide_inss: true,
        incide_ir: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  };

  const updateOcorrencia = async (
    id: string,
    patch: Partial<OcorrenciaBase>,
  ) => {
    const { error } = await fromUntyped("pjecalc_hist_salarial_mes")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    invalidate();
  };

  const updateHistorico = async (
    histId: string,
    patch: Partial<HistoricoBase>,
  ) => {
    const { error } = await fromUntyped("pjecalc_hist_salarial")
      .update(patch)
      .eq("id", histId);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    invalidate();
  };

  const addOcorrencia = async () => {
    if (!calculoId) {
      toast.error("Cálculo não disponível ainda — aguarde.");
      return;
    }
    try {
      const histId = await ensureHistorico("Salário Base");
      const today = new Date();
      const competencia = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}-01`;
      const { error } = await fromUntyped("pjecalc_hist_salarial_mes").insert({
        calculo_id: calculoId,
        case_id: caseId,
        hist_salarial_id: histId,
        competencia,
        valor: 0,
        origem: "INFORMADA",
      });
      if (error) throw error;
      invalidate();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  };

  const removeOcorrencia = async (r: GridRow) => {
    const { error } = await fromUntyped("pjecalc_hist_salarial_mes")
      .delete()
      .eq("id", r.ocorrenciaId);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    invalidate();
  };

  const columns: PjeCalcGridColumn<GridRow>[] = [
    {
      key: "competencia",
      header: "Competência",
      width: "w-28",
      cell: (r) => (
        <Input
          type="month"
          defaultValue={r.competencia}
          className="h-7 text-[11px] font-mono px-1"
          onBlur={(e) => {
            const v = e.target.value;
            if (v && v !== r.competencia) {
              updateOcorrencia(r.ocorrenciaId, { competencia: `${v}-01` });
            }
          }}
        />
      ),
    },
    {
      key: "nome",
      header: "Rubrica",
      cell: (r) => (
        <Input
          defaultValue={r.nomeRubrica}
          className="h-7 text-[11px] px-1.5"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== r.nomeRubrica && r.historicoId) {
              updateHistorico(r.historicoId, { nome: v });
            }
          }}
        />
      ),
    },
    {
      key: "tipoVariacao",
      header: "Tipo",
      width: "w-24",
      cell: (r) => (
        <Select
          value={r.tipoVariacao}
          onValueChange={(v) =>
            r.historicoId && updateHistorico(r.historicoId, { tipo_variacao: v })
          }
        >
          <SelectTrigger className="h-7 text-[11px] px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_VARIACAO.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-[11px]">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "valor",
      header: "Valor (R$)",
      align: "right",
      width: "w-28",
      cell: (r) => (
        <Input
          type="number"
          step="0.01"
          defaultValue={r.valor}
          className="h-7 text-[11px] text-right font-mono px-1"
          onBlur={(e) => {
            // CLAUDE.md: valores monetários via Decimal, nunca parseFloat.
            const raw = e.target.value;
            if (raw.trim() !== "" && !isValidMoney(raw)) {
              toast.error("Valor inválido (deve ser ≥ 0).");
              e.target.value = String(r.valor);
              return;
            }
            const v = toMoneyNumber(raw, 0);
            if (v !== r.valor) {
              updateOcorrencia(r.ocorrenciaId, { valor: v });
            }
          }}
        />
      ),
    },
    {
      key: "incide_inss",
      header: "INSS",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={r.incide_inss}
            onCheckedChange={(v) =>
              r.historicoId &&
              updateHistorico(r.historicoId, { incide_inss: !!v })
            }
          />
        </div>
      ),
    },
    {
      key: "incide_fgts",
      header: "FGTS",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={r.incide_fgts}
            onCheckedChange={(v) =>
              r.historicoId &&
              updateHistorico(r.historicoId, { incide_fgts: !!v })
            }
          />
        </div>
      ),
    },
    {
      key: "incide_ir",
      header: "IR",
      align: "center",
      width: "w-14",
      cell: (r) => (
        <div className="flex justify-center">
          <Checkbox
            checked={r.incide_ir}
            onCheckedChange={(v) =>
              r.historicoId &&
              updateHistorico(r.historicoId, { incide_ir: !!v })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <PjeCalcGrid<GridRow>
      title="Histórico Salarial"
      subtitle="Rubricas e ocorrências mensais. Holerites validados via OCR preenchem esta tabela automaticamente."
      rows={rows}
      rowKey={(r) => r.ocorrenciaId}
      columns={columns}
      onAdd={addOcorrencia}
      onDelete={removeOcorrencia}
      addLabel="Nova Ocorrência"
      loading={loadingH || loadingO}
      emptyMessage="Nenhuma ocorrência registrada. Importe uma ficha financeira ou faça upload de holerites na aba Documentos."
      headerActions={
        <ImportadorFichaFinanceira caseId={caseId} onImported={invalidate} />
      }
      rowClassName={(r) =>
        r.origem === "OCR" || r.documento_id
          ? "bg-blue-50/60 dark:bg-blue-950/15 border-l-2 border-l-blue-400"
          : undefined
      }
    />
  );
}
