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

interface Props {
  caseId: string;
}

interface HistoricoRow {
  id: string;
  case_id: string;
  nome: string;
  tipo_valor: string; // FIXA | VARIAVEL | INFORMADA  (visto da view)
  valor_informado: number | null;
  incidencia_fgts: boolean | null;
  incidencia_cs: boolean | null; // mapeado para incide_inss na tabela base
  observacoes: string | null;
}

interface OcorrenciaRow {
  id: string;
  historico_id: string;
  case_id: string;
  competencia: string; // "yyyy-MM-dd" ou "yyyy-MM"
  valor: number;
  tipo: string;
  origem: string | null;
  documento_id: string | null;
}

interface GridRow {
  ocorrenciaId: string;
  historicoId: string;
  competencia: string; // yyyy-MM
  nomeRubrica: string;
  tipoVariacao: string;
  valor: number;
  tipoLancamento: string;
  origem: string | null;
  documento_id: string | null;
  incide_inss: boolean;
  incide_fgts: boolean;
}

const TIPOS_VARIACAO = [
  { value: "FIXA", label: "Fixa" },
  { value: "VARIAVEL", label: "Variável" },
  { value: "INFORMADA", label: "Informada" },
];

const TIPOS_LANCAMENTO = [
  { value: "vencimento", label: "Vencimento" },
  { value: "desconto", label: "Desconto" },
  { value: "informado", label: "Informado" },
];

export function ModuloHistoricoSalarial({ caseId }: Props) {
  const qc = useQueryClient();

  const { data: historicos = [], isLoading: loadingH } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_historico_salarial")
        .select("*")
        .eq("case_id", caseId)
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as HistoricoRow[];
    },
  });

  const { data: ocorrencias = [], isLoading: loadingO } = useQuery({
    queryKey: ["pjecalc_historico_ocorrencias", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_historico_ocorrencias")
        .select("*")
        .eq("case_id", caseId)
        .order("competencia");
      if (error) throw error;
      return (data || []) as unknown as OcorrenciaRow[];
    },
  });

  const histById = useMemo(() => {
    const m = new Map<string, HistoricoRow>();
    for (const h of historicos) m.set(h.id, h);
    return m;
  }, [historicos]);

  const rows: GridRow[] = useMemo(() => {
    return ocorrencias.map((o) => {
      const h = histById.get(o.historico_id);
      return {
        ocorrenciaId: o.id,
        historicoId: o.historico_id,
        competencia: o.competencia.slice(0, 7),
        nomeRubrica: h?.nome ?? "—",
        tipoVariacao: h?.tipo_valor ?? "VARIAVEL",
        valor: Number(o.valor) || 0,
        tipoLancamento: o.tipo || "informado",
        origem: o.origem,
        documento_id: o.documento_id,
        incide_inss: !!h?.incidencia_cs,
        incide_fgts: !!h?.incidencia_fgts,
      };
    });
  }, [ocorrencias, histById]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] });
    qc.invalidateQueries({
      queryKey: ["pjecalc_historico_ocorrencias", caseId],
    });
  };

  /**
   * Garante a existência da rubrica "mãe" pelo nome; cria se não houver.
   */
  const ensureHistorico = async (nome: string): Promise<string> => {
    const nomeNorm = nome.toUpperCase().trim() || "BASE";
    for (const h of historicos) {
      if (h.nome.toUpperCase().trim() === nomeNorm) return h.id;
    }
    const { data, error } = await fromUntyped("pjecalc_historico_salarial")
      .insert({
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

  const updateOcorrencia = async (id: string, patch: Partial<OcorrenciaRow>) => {
    const { error } = await fromUntyped("pjecalc_historico_ocorrencias")
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
    patch: {
      nome?: string;
      tipo_variacao?: string;
      incide_inss?: boolean;
      incide_fgts?: boolean;
    },
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
    try {
      const histId = await ensureHistorico("Salário Base");
      const today = new Date();
      const competencia = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, "0")}-01`;
      const { error } = await fromUntyped("pjecalc_historico_ocorrencias")
        .insert({
          case_id: caseId,
          historico_id: histId,
          competencia,
          valor: 0,
          tipo: "vencimento",
          origem: "INFORMADA",
        });
      if (error) throw error;
      invalidate();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  };

  const removeOcorrencia = async (r: GridRow) => {
    const { error } = await fromUntyped("pjecalc_historico_ocorrencias")
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
            if (v && v !== r.nomeRubrica) {
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
            updateHistorico(r.historicoId, { tipo_variacao: v })
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
            const v = parseFloat(e.target.value) || 0;
            if (v !== r.valor) {
              updateOcorrencia(r.ocorrenciaId, { valor: v });
            }
          }}
        />
      ),
    },
    {
      key: "tipoLancamento",
      header: "Lançam.",
      width: "w-28",
      cell: (r) => (
        <Select
          value={r.tipoLancamento}
          onValueChange={(v) =>
            updateOcorrencia(r.ocorrenciaId, { tipo: v })
          }
        >
          <SelectTrigger className="h-7 text-[11px] px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_LANCAMENTO.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-[11px]">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              updateHistorico(r.historicoId, { incide_fgts: !!v })
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
