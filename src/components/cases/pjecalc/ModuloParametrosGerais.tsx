import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import Decimal from "decimal.js";
import { IBGECombobox } from "./IBGECombobox";

Decimal.set({ precision: 20 });

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
const TRTS = Array.from({ length: 24 }, (_, i) => `TRT${String(i + 1).padStart(2, "0")}`);
const TRFS = Array.from({ length: 6 }, (_, i) => `TRF${i + 1}`);
const TJS = [
  "TJAC","TJAL","TJAM","TJAP","TJBA","TJCE","TJDF","TJES","TJGO","TJMA","TJMG","TJMS","TJMT",
  "TJPA","TJPB","TJPE","TJPI","TJPR","TJRJ","TJRN","TJRO","TJRR","TJRS","TJSC","TJSE","TJSP","TJTO",
];

function tribunaisPorJustica(j: string): string[] {
  if (j === "FEDERAL") return TRFS;
  if (j === "ESTADUAL") return TJS;
  return TRTS;
}

// =====================================================
// MÓDULO PARÂMETROS GERAIS — baseado em Calculo.java (PJe-Calc v2.15.1)
// Persiste em pjecalc_calculos (uma linha por case_id).
// Município IBGE: combobox via API oficial https://servicodados.ibge.gov.br
// =====================================================

interface Props { caseId: string; }

type FormState = {
  titulo: string;
  observacoes: string;
  tags: string; // CSV na UI
  data_admissao: string;
  data_demissao: string;
  data_ajuizamento: string;
  data_inicio_calculo: string;
  data_fim_calculo: string;
  data_liquidacao: string;
  valor_ultima_remuneracao: string;
  valor_maior_remuneracao: string;
  uf: string;
  municipio_ibge: string;
  instancia: string;
  fase: string;
  tipo_demissao: string;
  aviso_previo_tipo: string;
  aviso_previo_dias: string;
  jornada_contratual_horas: string;
  divisor_horas: string;
  regime_contrato: string;
  projetar_aviso_indenizado: boolean;
  sabado_dia_util: boolean;
  prescricao_fgts: boolean;
  prescricao_quinquenal: boolean;
  data_prescricao_quinquenal: string;
  considera_feriado_estadual: boolean;
  considera_feriado_municipal: boolean;
  dia_fechamento_mes: string;
  percentual_he_50: string;
  percentual_he_100: string;
  percentual_adicional_noturno: string;
  // Bloco CNJ — paridade PJe-Calc oficial
  cnj_numero_processo: string;
  cnj_valor_causa: string;
  cnj_tribunal: string;
  cnj_justica: string;
  cnj_vara: string;
  cnj_doc_previdenciario: string;
};

const defaults: FormState = {
  titulo: "",
  observacoes: "",
  tags: "",
  data_admissao: "",
  data_demissao: "",
  data_ajuizamento: "",
  data_inicio_calculo: "",
  data_fim_calculo: "",
  data_liquidacao: "",
  valor_ultima_remuneracao: "",
  valor_maior_remuneracao: "",
  uf: "",
  municipio_ibge: "",
  instancia: "PRIMEIRA",
  fase: "LIQUIDACAO",
  tipo_demissao: "sem_justa_causa",
  aviso_previo_tipo: "indenizado",
  aviso_previo_dias: "30",
  jornada_contratual_horas: "220",
  divisor_horas: "220",
  regime_contrato: "INTEGRAL",
  projetar_aviso_indenizado: true,
  sabado_dia_util: false,
  prescricao_fgts: false,
  prescricao_quinquenal: true,
  data_prescricao_quinquenal: "",
  considera_feriado_estadual: true,
  considera_feriado_municipal: false,
  dia_fechamento_mes: "31",
  percentual_he_50: "50",
  percentual_he_100: "100",
  percentual_adicional_noturno: "20",
  cnj_numero_processo: "",
  cnj_valor_causa: "",
  cnj_tribunal: "",
  cnj_justica: "TRABALHO",
  cnj_vara: "",
  cnj_doc_previdenciario: "",
};

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export function ModuloParametrosGerais({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaults);

  const { data } = useQuery({
    queryKey: ["pjecalc_calculos", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pjecalc_calculos" as any)
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    const d = data as unknown as Record<string, unknown>;
    const dp = (d.dados_processo as Record<string, unknown> | null) ?? {};
    setForm({
      titulo: (d.titulo as string) ?? defaults.titulo,
      observacoes: (d.observacoes as string) ?? defaults.observacoes,
      tags: Array.isArray(d.tags) ? (d.tags as string[]).join(", ") : "",
      data_admissao: (d.data_admissao as string) ?? "",
      data_demissao: (d.data_demissao as string) ?? "",
      data_ajuizamento: (d.data_ajuizamento as string) ?? "",
      data_inicio_calculo: (d.data_inicio_calculo as string) ?? "",
      data_fim_calculo: (d.data_fim_calculo as string) ?? "",
      data_liquidacao: (d.data_liquidacao as string) ?? "",
      valor_ultima_remuneracao: d.valor_ultima_remuneracao?.toString() ?? "",
      valor_maior_remuneracao: d.valor_maior_remuneracao?.toString() ?? "",
      uf: (d.uf as string) ?? "",
      municipio_ibge: (d.municipio_ibge as string) ?? "",
      instancia: (d.instancia as string) ?? defaults.instancia,
      fase: (d.fase as string) ?? defaults.fase,
      tipo_demissao: (d.tipo_demissao as string) ?? defaults.tipo_demissao,
      aviso_previo_tipo: (d.aviso_previo_tipo as string) ?? defaults.aviso_previo_tipo,
      aviso_previo_dias: d.aviso_previo_dias?.toString() ?? defaults.aviso_previo_dias,
      jornada_contratual_horas: d.jornada_contratual_horas?.toString() ?? defaults.jornada_contratual_horas,
      divisor_horas: d.divisor_horas?.toString() ?? defaults.divisor_horas,
      regime_contrato: (d.regime_contrato as string) ?? defaults.regime_contrato,
      projetar_aviso_indenizado: (d.projetar_aviso_indenizado as boolean) ?? defaults.projetar_aviso_indenizado,
      sabado_dia_util: (d.sabado_dia_util as boolean) ?? defaults.sabado_dia_util,
      prescricao_fgts: (d.prescricao_fgts as boolean) ?? defaults.prescricao_fgts,
      prescricao_quinquenal: (d.prescricao_quinquenal as boolean) ?? defaults.prescricao_quinquenal,
      data_prescricao_quinquenal: (d.data_prescricao_quinquenal as string) ?? "",
      considera_feriado_estadual: (d.considera_feriado_estadual as boolean) ?? defaults.considera_feriado_estadual,
      considera_feriado_municipal: (d.considera_feriado_municipal as boolean) ?? defaults.considera_feriado_municipal,
      dia_fechamento_mes: d.dia_fechamento_mes?.toString() ?? defaults.dia_fechamento_mes,
      percentual_he_50: d.percentual_he_50?.toString() ?? defaults.percentual_he_50,
      percentual_he_100: d.percentual_he_100?.toString() ?? defaults.percentual_he_100,
      percentual_adicional_noturno: d.percentual_adicional_noturno?.toString() ?? defaults.percentual_adicional_noturno,
      cnj_numero_processo: (dp.cnj_numero_processo as string) ?? "",
      cnj_valor_causa: dp.cnj_valor_causa != null ? String(dp.cnj_valor_causa) : "",
      cnj_tribunal: (dp.cnj_tribunal as string) ?? "",
      cnj_justica: (dp.cnj_justica as string) ?? defaults.cnj_justica,
      cnj_vara: (dp.cnj_vara as string) ?? "",
      cnj_doc_previdenciario: (dp.cnj_doc_previdenciario as string) ?? "",
    });
  }, [data]);

  const toNumOrNull = (v: string) => {
    if (!v || v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const toIntOrNull = (v: string) => {
    if (!v || v.trim() === "") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  const toDateOrNull = (v: string) => (v && v.trim() !== "" ? v : null);

  const save = async () => {
    setSaving(true);
    try {
      // Validar CNJ se preenchido
      if (form.cnj_numero_processo && !CNJ_REGEX.test(form.cnj_numero_processo)) {
        toast.error("Número CNJ inválido. Formato: NNNNNNN-NN.NNNN.N.NN.NNNN");
        setSaving(false);
        return;
      }
      // Decimal.js para valor da causa (paridade PJe-Calc)
      let cnjValorCausa: string | null = null;
      if (form.cnj_valor_causa.trim() !== "") {
        try {
          cnjValorCausa = new Decimal(form.cnj_valor_causa.replace(",", ".")).toFixed(2);
        } catch {
          toast.error("Valor da causa inválido.");
          setSaving(false);
          return;
        }
      }
      const dadosProcesso = {
        cnj_numero_processo: form.cnj_numero_processo || null,
        cnj_valor_causa: cnjValorCausa,
        cnj_tribunal: form.cnj_tribunal || null,
        cnj_justica: form.cnj_justica || null,
        cnj_vara: form.cnj_vara || null,
        cnj_doc_previdenciario: form.cnj_doc_previdenciario || null,
      };
      const payload = {
        case_id: caseId,
        titulo: form.titulo || null,
        observacoes: form.observacoes || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        data_admissao: toDateOrNull(form.data_admissao),
        data_demissao: toDateOrNull(form.data_demissao),
        data_ajuizamento: toDateOrNull(form.data_ajuizamento),
        data_inicio_calculo: toDateOrNull(form.data_inicio_calculo),
        data_fim_calculo: toDateOrNull(form.data_fim_calculo),
        data_liquidacao: toDateOrNull(form.data_liquidacao),
        valor_ultima_remuneracao: toNumOrNull(form.valor_ultima_remuneracao),
        valor_maior_remuneracao: toNumOrNull(form.valor_maior_remuneracao),
        uf: form.uf || null,
        municipio_ibge: form.municipio_ibge || null,
        instancia: form.instancia,
        fase: form.fase,
        tipo_demissao: form.tipo_demissao,
        aviso_previo_tipo: form.aviso_previo_tipo,
        aviso_previo_dias: toIntOrNull(form.aviso_previo_dias),
        jornada_contratual_horas: toNumOrNull(form.jornada_contratual_horas),
        divisor_horas: toNumOrNull(form.divisor_horas),
        regime_contrato: form.regime_contrato,
        projetar_aviso_indenizado: form.projetar_aviso_indenizado,
        sabado_dia_util: form.sabado_dia_util,
        prescricao_fgts: form.prescricao_fgts,
        prescricao_quinquenal: form.prescricao_quinquenal,
        data_prescricao_quinquenal: toDateOrNull(form.data_prescricao_quinquenal),
        considera_feriado_estadual: form.considera_feriado_estadual,
        considera_feriado_municipal: form.considera_feriado_municipal,
        dia_fechamento_mes: toIntOrNull(form.dia_fechamento_mes),
        percentual_he_50: toNumOrNull(form.percentual_he_50),
        percentual_he_100: toNumOrNull(form.percentual_he_100),
        percentual_adicional_noturno: toNumOrNull(form.percentual_adicional_noturno),
        dados_processo: dadosProcesso,
      };
      const { error } = await supabase
        .from("pjecalc_calculos" as any)
        .upsert(payload, { onConflict: "case_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pjecalc_calculos", caseId] });
      toast.success("Parâmetros gerais salvos!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Parâmetros Gerais</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identificação CNJ (paridade PJe-Calc)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Número do Processo (CNJ)</Label>
            <Input
              value={form.cnj_numero_processo}
              onChange={(e) => setForm((p) => ({ ...p, cnj_numero_processo: e.target.value }))}
              className="h-8 text-xs"
              placeholder="NNNNNNN-NN.NNNN.N.NN.NNNN"
            />
            {form.cnj_numero_processo && !CNJ_REGEX.test(form.cnj_numero_processo) && (
              <p className="text-[10px] text-destructive mt-0.5">Formato inválido</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Valor da Causa (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={form.cnj_valor_causa}
              onChange={(e) => setForm((p) => ({ ...p, cnj_valor_causa: e.target.value }))}
              className="h-8 text-xs"
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-xs">Justiça</Label>
            <Select
              value={form.cnj_justica}
              onValueChange={(v) => setForm((p) => ({ ...p, cnj_justica: v, cnj_tribunal: "" }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TRABALHO">Trabalho</SelectItem>
                <SelectItem value="FEDERAL">Federal</SelectItem>
                <SelectItem value="ESTADUAL">Estadual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tribunal</Label>
            <Select value={form.cnj_tribunal} onValueChange={(v) => setForm((p) => ({ ...p, cnj_tribunal: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tribunaisPorJustica(form.cnj_justica).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Vara</Label>
            <Input
              value={form.cnj_vara}
              onChange={(e) => setForm((p) => ({ ...p, cnj_vara: e.target.value }))}
              className="h-8 text-xs"
              placeholder="Ex.: 1ª Vara do Trabalho de São Paulo"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Documento Previdenciário (PIS/PASEP/NIT/CTPS)</Label>
            <Input
              value={form.cnj_doc_previdenciario}
              onChange={(e) => setForm((p) => ({ ...p, cnj_doc_previdenciario: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Tags (vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="h-8 text-xs" placeholder="urgente, acordo" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} className="text-xs min-h-[60px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Datas do Contrato e Cálculo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Admissão</Label><Input type="date" value={form.data_admissao} onChange={(e) => setForm((p) => ({ ...p, data_admissao: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Demissão</Label><Input type="date" value={form.data_demissao} onChange={(e) => setForm((p) => ({ ...p, data_demissao: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Ajuizamento</Label><Input type="date" value={form.data_ajuizamento} onChange={(e) => setForm((p) => ({ ...p, data_ajuizamento: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Início Cálculo</Label><Input type="date" value={form.data_inicio_calculo} onChange={(e) => setForm((p) => ({ ...p, data_inicio_calculo: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Fim Cálculo</Label><Input type="date" value={form.data_fim_calculo} onChange={(e) => setForm((p) => ({ ...p, data_fim_calculo: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Liquidação</Label><Input type="date" value={form.data_liquidacao} onChange={(e) => setForm((p) => ({ ...p, data_liquidacao: e.target.value }))} className="h-8 text-xs" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Remuneração e Localidade</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Última Remuneração (R$)</Label><Input type="number" step="0.01" value={form.valor_ultima_remuneracao} onChange={(e) => setForm((p) => ({ ...p, valor_ultima_remuneracao: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Maior Remuneração (R$)</Label><Input type="number" step="0.01" value={form.valor_maior_remuneracao} onChange={(e) => setForm((p) => ({ ...p, valor_maior_remuneracao: e.target.value }))} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">UF</Label>
            <Select value={form.uf} onValueChange={(v) => setForm((p) => ({ ...p, uf: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Município (IBGE)</Label>
            <IBGECombobox
              value={form.municipio_ibge}
              uf={form.uf || undefined}
              onChange={(codigo) => setForm((p) => ({ ...p, municipio_ibge: codigo }))}
              placeholder={form.uf ? "Selecione o município..." : "Selecione UF antes"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fase e Contrato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Instância</Label>
            <Select value={form.instancia} onValueChange={(v) => setForm((p) => ({ ...p, instancia: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMEIRA">Primeira</SelectItem>
                <SelectItem value="SEGUNDA">Segunda</SelectItem>
                <SelectItem value="TERCEIRA">Terceira</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fase</Label>
            <Select value={form.fase} onValueChange={(v) => setForm((p) => ({ ...p, fase: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONHECIMENTO">Conhecimento</SelectItem>
                <SelectItem value="LIQUIDACAO">Liquidação</SelectItem>
                <SelectItem value="EXECUCAO">Execução</SelectItem>
                <SelectItem value="CUMPRIMENTO_SENTENCA">Cumprimento de Sentença</SelectItem>
                <SelectItem value="PRECATORIO">Precatório</SelectItem>
                <SelectItem value="RPV">RPV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de Demissão</Label>
            <Select value={form.tipo_demissao} onValueChange={(v) => setForm((p) => ({ ...p, tipo_demissao: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_justa_causa">Dispensa sem justa causa</SelectItem>
                <SelectItem value="com_justa_causa">Dispensa com justa causa</SelectItem>
                <SelectItem value="pedido_demissao">Pedido de demissão</SelectItem>
                <SelectItem value="acordo">Acordo (art. 484-A)</SelectItem>
                <SelectItem value="termino_contrato">Término de contrato determinado</SelectItem>
                <SelectItem value="rescisao_indireta">Rescisão indireta</SelectItem>
                <SelectItem value="culpa_reciproca">Culpa recíproca</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
                <SelectItem value="aposentadoria">Aposentadoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Aviso Prévio</Label>
            <Select value={form.aviso_previo_tipo} onValueChange={(v) => setForm((p) => ({ ...p, aviso_previo_tipo: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indenizado">Indenizado</SelectItem>
                <SelectItem value="trabalhado">Trabalhado</SelectItem>
                <SelectItem value="sem_aviso">Sem aviso</SelectItem>
                <SelectItem value="informado">Informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Dias do Aviso</Label><Input type="number" value={form.aviso_previo_dias} onChange={(e) => setForm((p) => ({ ...p, aviso_previo_dias: e.target.value }))} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Regime do Contrato</Label>
            <Select value={form.regime_contrato} onValueChange={(v) => setForm((p) => ({ ...p, regime_contrato: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INTEGRAL">Integral</SelectItem>
                <SelectItem value="PARCIAL">Parcial</SelectItem>
                <SelectItem value="INTERMITENTE">Intermitente</SelectItem>
                <SelectItem value="TELETRABALHO">Teletrabalho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Jornada Contratual (h/mês)</Label><Input type="number" step="0.01" value={form.jornada_contratual_horas} onChange={(e) => setForm((p) => ({ ...p, jornada_contratual_horas: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Divisor de Horas</Label><Input type="number" step="0.01" value={form.divisor_horas} onChange={(e) => setForm((p) => ({ ...p, divisor_horas: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Dia de Fechamento do Mês</Label><Input type="number" value={form.dia_fechamento_mes} onChange={(e) => setForm((p) => ({ ...p, dia_fechamento_mes: e.target.value }))} className="h-8 text-xs" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Percentuais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">HE 50% (%)</Label><Input type="number" step="0.01" value={form.percentual_he_50} onChange={(e) => setForm((p) => ({ ...p, percentual_he_50: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">HE 100% (%)</Label><Input type="number" step="0.01" value={form.percentual_he_100} onChange={(e) => setForm((p) => ({ ...p, percentual_he_100: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Adic. Noturno (%)</Label><Input type="number" step="0.01" value={form.percentual_adicional_noturno} onChange={(e) => setForm((p) => ({ ...p, percentual_adicional_noturno: e.target.value }))} className="h-8 text-xs" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Flags de Cálculo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.projetar_aviso_indenizado} onCheckedChange={(v) => setForm((p) => ({ ...p, projetar_aviso_indenizado: !!v }))} /> Projetar aviso prévio indenizado</label>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.sabado_dia_util} onCheckedChange={(v) => setForm((p) => ({ ...p, sabado_dia_util: !!v }))} /> Sábado como dia útil</label>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.prescricao_fgts} onCheckedChange={(v) => setForm((p) => ({ ...p, prescricao_fgts: !!v }))} /> Prescrição FGTS</label>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.prescricao_quinquenal} onCheckedChange={(v) => setForm((p) => ({ ...p, prescricao_quinquenal: !!v }))} /> Prescrição quinquenal</label>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Data prescrição quinquenal</Label>
            <Input type="date" value={form.data_prescricao_quinquenal} onChange={(e) => setForm((p) => ({ ...p, data_prescricao_quinquenal: e.target.value }))} className="h-7 text-xs w-40" disabled={!form.prescricao_quinquenal} />
          </div>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.considera_feriado_estadual} onCheckedChange={(v) => setForm((p) => ({ ...p, considera_feriado_estadual: !!v }))} /> Considera feriado estadual</label>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.considera_feriado_municipal} onCheckedChange={(v) => setForm((p) => ({ ...p, considera_feriado_municipal: !!v }))} /> Considera feriado municipal</label>
        </CardContent>
      </Card>
    </div>
  );
}
