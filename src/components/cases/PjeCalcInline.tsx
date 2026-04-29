import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Save, Play, FileText, Calendar, Clock,
  DollarSign, Building2, Receipt, Percent, TrendingUp, FileBarChart,
  Check, Plus, Trash2, Loader2, Briefcase, Calculator,
  Scale, Shield, Gavel, Users, Landmark, Zap, Pencil,
  ChevronDown, ChevronRight, ClipboardList, CalendarClock,
  Wallet, Banknote, ScrollText, HeartHandshake, Activity,
  BookOpen, Settings2, AlertCircle, Sparkles,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// Module components
import { AutoFillReviewPanel } from "./AutoFillReviewPanel";
import { ModuloDadosProcesso } from "./pjecalc/ModuloDadosProcesso";
import { ModuloCartaoPonto } from "./pjecalc/ModuloCartaoPonto";
import { ModuloCartaoPontoDiario } from "./pjecalc/ModuloCartaoPontoDiario";
import { ModuloFGTS } from "./pjecalc/ModuloFGTS";
import { ModuloCS } from "./pjecalc/ModuloCS";
import { ModuloIR } from "./pjecalc/ModuloIR";
import { ModuloCorrecao } from "./pjecalc/ModuloCorrecao";
import { ModuloSeguroDesemprego } from "./pjecalc/ModuloSeguroDesemprego";
import { ModuloHonorarios } from "./pjecalc/ModuloHonorarios";
import { ModuloCustas } from "./pjecalc/ModuloCustas";
import { ModuloResumo } from "./pjecalc/ModuloResumo";
import { ModuloMultasCLT } from "./pjecalc/ModuloMultasCLT";
import { ModuloPensaoAlimenticia } from "./pjecalc/ModuloPensaoAlimenticia";
import { ModuloPrevidenciaPrivada } from "./pjecalc/ModuloPrevidenciaPrivada";
import { ModuloSalarioFamilia } from "./pjecalc/ModuloSalarioFamilia";
import { ImportadorFichaFinanceira } from "./pjecalc/ImportadorFichaFinanceira";
import { ModuloValeTransporte } from "./pjecalc/ModuloValeTransporte";
import { ModuloAdvogados } from "./pjecalc/ModuloAdvogados";
import { ModuloESocial } from "./pjecalc/ModuloESocial";
import { ModuloExcecoesJuros } from "./pjecalc/ModuloExcecoesJuros";
import { ModuloAjusteSentenca } from "./pjecalc/ModuloAjusteSentenca";
import { ModuloGuiasRecolhimento } from "./pjecalc/ModuloGuiasRecolhimento";
import { ModuloAtualizacao } from "./pjecalc/ModuloAtualizacao";
import { ModuloDanosMorais } from "./pjecalc/ModuloDanosMorais";
import { ModuloEquiparacaoSalarial } from "./pjecalc/ModuloEquiparacaoSalarial";
import { ModuloEstabilidade } from "./pjecalc/ModuloEstabilidade";
import { ModuloPericulosidade } from "./pjecalc/ModuloPericulosidade";
import { ModuloTerceiros } from "./pjecalc/ModuloTerceiros";
import { ModuloParametrosGerais } from "./pjecalc/ModuloParametrosGerais";
import { ModuloVerbasCadastro } from "./pjecalc/ModuloVerbasCadastro";
import { ModuloPagamentos } from "./pjecalc/ModuloPagamentos";
import { ModuloExcecoesCarga } from "./pjecalc/ModuloExcecoesCarga";
import { ModuloExcecoesSabado } from "./pjecalc/ModuloExcecoesSabado";
import { ModuloHistoricoSalarial } from "./pjecalc/ModuloHistoricoSalarial";
import { ModuloFaltas } from "./pjecalc/ModuloFaltas";
import { ModuloFerias } from "./pjecalc/ModuloFerias";
import { calcularCompletude, type ModuleStatus } from "@/lib/pjecalc/completude";
import { logger } from "@/lib/logger";

  // ── Hierarchical sections (PJe-Calc official layout) ──
  interface ModuloDef {
    id: string;
    label: string;
    icon: any;
  }
  interface SecaoDef {
    id: string;
    label: string;
    icon: any;
    modulos: ModuloDef[];
  }
  const SECOES: SecaoDef[] = [
    {
      id: 'sec_dados',
      label: '1. Dados do Cálculo',
      icon: ClipboardList,
      modulos: [
        { id: 'dados_processo', label: 'Dados do Processo', icon: Gavel },
        { id: 'parametros_gerais', label: 'Parâmetros Gerais', icon: Settings2 },
        { id: 'advogados', label: 'Advogados', icon: Users },
      ],
    },
    {
      id: 'sec_periodos',
      label: '2. Períodos e Ponto',
      icon: CalendarClock,
      modulos: [
        { id: 'historico', label: 'Histórico Salarial', icon: DollarSign },
        { id: 'faltas', label: 'Faltas', icon: Clock },
        { id: 'ferias', label: 'Férias', icon: Calendar },
        { id: 'cartao_ponto', label: 'Cartão de Ponto', icon: Clock },
        { id: 'cartao_ponto_diario', label: 'Apuração Diária', icon: Activity },
        { id: 'excecoes_carga', label: 'Exceções Carga Horária', icon: AlertCircle },
        { id: 'excecoes_sabado', label: 'Exceções Sábado', icon: AlertCircle },
      ],
    },
    {
      id: 'sec_verbas',
      label: '3. Verbas e Ocorrências',
      icon: Wallet,
      modulos: [
        { id: 'verbas_cadastro', label: 'Cadastro de Verbas', icon: FileText },
        { id: 'ocorrencias', label: 'Ocorrências', icon: ScrollText },
        { id: 'pagamentos', label: 'Pagamentos', icon: Banknote },
        { id: 'vale_transporte', label: 'Vale Transporte', icon: Receipt },
      ],
    },
    {
      id: 'sec_tributos',
      label: '4. Tributos',
      icon: Percent,
      modulos: [
        { id: 'cs', label: 'INSS / Contrib. Social', icon: Receipt },
        { id: 'ir', label: 'Imposto de Renda', icon: Percent },
        { id: 'fgts', label: 'FGTS', icon: Building2 },
      ],
    },
    {
      id: 'sec_outros',
      label: '5. Outros Módulos',
      icon: HeartHandshake,
      modulos: [
        { id: 'pensao', label: 'Pensão Alimentícia', icon: Users },
        { id: 'prev_privada', label: 'Previdência Privada', icon: Briefcase },
        { id: 'salario_familia', label: 'Salário Família', icon: Users },
        { id: 'seguro_desemprego', label: 'Seguro Desemprego', icon: Shield },
      ],
    },
    {
      id: 'sec_ajustes',
      label: '6. Ajustes Financeiros',
      icon: Scale,
      modulos: [
        { id: 'multas', label: 'Multas CLT', icon: Gavel },
        { id: 'honorarios', label: 'Honorários', icon: Scale },
        { id: 'custas', label: 'Custas Judiciais', icon: Landmark },
      ],
    },
    {
      id: 'sec_atualizacao',
      label: '7. Atualização Monetária',
      icon: TrendingUp,
      modulos: [
        { id: 'correcao', label: 'Correção / Juros', icon: TrendingUp },
        { id: 'atualizacao', label: 'Tabela de Juros', icon: BookOpen },
        { id: 'excecoes_juros', label: 'Exceções de Juros', icon: AlertCircle },
      ],
    },
    {
      id: 'sec_resultado',
      label: '8. Resultado e Relatórios',
      icon: FileBarChart,
      modulos: [
        { id: 'resumo', label: 'Resumo', icon: FileBarChart },
        { id: 'ajuste_sentenca', label: 'Ajuste Sentença', icon: Gavel },
        { id: 'guias_recolhimento', label: 'Guias de Recolhimento', icon: FileText },
        { id: 'esocial', label: 'e-Social', icon: FileText },
        { id: 'danos_morais', label: 'Danos Morais', icon: Sparkles },
        { id: 'equiparacao', label: 'Equiparação Salarial', icon: Scale },
        { id: 'estabilidade', label: 'Estabilidade', icon: Shield },
        { id: 'periculosidade', label: 'Periculosidade', icon: AlertCircle },
        { id: 'terceiros', label: 'Terceiros', icon: Building2 },
      ],
    },
  ];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface PjeCalcInlineProps {
  caseId: string;
}

// ── Stub for new modules not yet implemented (Calculo.java) ──
function ModuloStub({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <Card className="rounded-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Em construção — {descricao || 'campos de Calculo.java a serem mapeados'}.
      </CardContent>
    </Card>
  );
}

export function PjeCalcInline({ caseId }: PjeCalcInlineProps) {
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState('dados_processo');
  const [saving, setSaving] = useState(false);
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  // Expand all sections by default so sidebar tree is usable on first render
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(SECOES.map(s => s.id))
  );

  const toggleSection = useCallback((secId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId); else next.add(secId);
      return next;
    });
  }, []);

  // DATA
  const { data: params } = useQuery({
    queryKey: ["pjecalc_parametros", caseId],
    queryFn: async () => {
      const { data, error } = await fromUntyped("pjecalc_parametros").select("*").eq("case_id", caseId).maybeSingle();
      if (error) throw error;
      return data as unknown as Record<string, unknown> | null;
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["employment_contract", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("employment_contracts").select("*").eq("case_id", caseId).maybeSingle();
      return data as unknown as Record<string, unknown> | null;
    },
  });

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_faltas").select("*").eq("case_id", caseId).order("data_inicial");
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ["pjecalc_ferias", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_ferias").select("*").eq("case_id", caseId).order("periodo_aquisitivo_inicio");
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_historico_salarial").select("*").eq("case_id", caseId).order("periodo_inicio");
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const { data: verbas = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_verbas").select("*").eq("case_id", caseId).order("ordem");
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const { data: dadosProcesso } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_dados_processo").select("*").eq("case_id", caseId).maybeSingle();
      return data as unknown as Record<string, unknown> | null;
    },
  });

  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao", caseId],
    queryFn: async () => {
      const { data } = await fromUntyped("pjecalc_liquidacao_resultado").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as unknown as Record<string, unknown> | null;
    },
  });

  // FORM STATE
  const [formParams, setFormParams] = useState({
    estado: 'SP', municipio: '', data_admissao: '', data_demissao: '',
    data_ajuizamento: '', data_inicial: '', data_final: '',
    prescricao_quinquenal: false, prescricao_fgts: false,
    regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
    maior_remuneracao: '', ultima_remuneracao: '',
    prazo_aviso_previo: 'nao_apurar', prazo_aviso_dias: '',
    projetar_aviso_indenizado: false, limitar_avos_periodo: false,
    zerar_valor_negativo: false, sabado_dia_util: true,
    considerar_feriado_estadual: false, considerar_feriado_municipal: false,
    tipo_mes: 'comercial' as 'comercial' | 'civil',
    comentarios: '',
  });

  useEffect(() => {
    if (params) {
      setFormParams({
        estado: params.estado || 'SP', municipio: params.municipio || '',
        data_admissao: params.data_admissao || '', data_demissao: params.data_demissao || '',
        data_ajuizamento: params.data_ajuizamento || '',
        data_inicial: params.data_inicial || '', data_final: params.data_final || '',
        prescricao_quinquenal: params.prescricao_quinquenal || false,
        prescricao_fgts: params.prescricao_fgts || false,
        regime_trabalho: params.regime_trabalho || 'tempo_integral',
        carga_horaria_padrao: params.carga_horaria_padrao || 220,
        maior_remuneracao: params.maior_remuneracao?.toString() || '',
        ultima_remuneracao: params.ultima_remuneracao?.toString() || '',
        prazo_aviso_previo: params.prazo_aviso_previo || 'nao_apurar',
        prazo_aviso_dias: params.prazo_aviso_dias?.toString() || '',
        projetar_aviso_indenizado: params.projetar_aviso_indenizado || false,
        limitar_avos_periodo: params.limitar_avos_periodo || false,
        zerar_valor_negativo: params.zerar_valor_negativo || false,
        sabado_dia_util: params.sabado_dia_util ?? true,
        considerar_feriado_estadual: params.considerar_feriado_estadual || false,
        considerar_feriado_municipal: params.considerar_feriado_municipal || false,
        tipo_mes: ((params as Record<string, unknown>).tipo_mes as 'comercial' | 'civil') || 'comercial',
        comentarios: params.comentarios || '',
      });
    } else if (contract) {
      setFormParams(prev => ({
        ...prev,
        data_admissao: contract.data_admissao || '',
        data_demissao: contract.data_demissao || '',
        carga_horaria_padrao: (contract.jornada_contratual as Record<string, unknown>)?.divisor || 220,
      }));
    }
  }, [params, contract]);

  // ── AUTO-SYNC: preencher módulos automaticamente ao abrir ──
  useEffect(() => {
    if (autoSyncDone) return;
    // Wait for queries to settle
    if (params !== undefined || contract !== undefined) {
      // If params already exist, skip auto-sync
      if (params?.id) {
        setAutoSyncDone(true);
        return;
      }
      // Run auto-sync
      (async () => {
        setSyncing(true);
        setAutoSyncDone(true);
        try {
          logger.warn('syncFromValidation removed');
        } catch (e) {
          logger.warn("Auto-sync falhou", { error: e });
        } finally {
          setSyncing(false);
        }
      })();
    }
  }, [params, contract, autoSyncDone, caseId, queryClient]);

  const saveParams = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, estado: formParams.estado, municipio: formParams.municipio,
        data_admissao: formParams.data_admissao, data_demissao: formParams.data_demissao || null,
        data_ajuizamento: formParams.data_ajuizamento,
        data_inicial: formParams.data_inicial || null, data_final: formParams.data_final || null,
        prescricao_quinquenal: formParams.prescricao_quinquenal,
        prescricao_fgts: formParams.prescricao_fgts,
        regime_trabalho: formParams.regime_trabalho,
        carga_horaria_padrao: formParams.carga_horaria_padrao,
        maior_remuneracao: formParams.maior_remuneracao ? parseFloat(formParams.maior_remuneracao) : null,
        ultima_remuneracao: formParams.ultima_remuneracao ? parseFloat(formParams.ultima_remuneracao) : null,
        prazo_aviso_previo: formParams.prazo_aviso_previo,
        prazo_aviso_dias: formParams.prazo_aviso_dias ? parseInt(formParams.prazo_aviso_dias) : null,
        projetar_aviso_indenizado: formParams.projetar_aviso_indenizado,
        limitar_avos_periodo: formParams.limitar_avos_periodo,
        zerar_valor_negativo: formParams.zerar_valor_negativo,
        sabado_dia_util: formParams.sabado_dia_util,
        considerar_feriado_estadual: formParams.considerar_feriado_estadual,
        considerar_feriado_municipal: formParams.considerar_feriado_municipal,
        tipo_mes: formParams.tipo_mes,
        comentarios: formParams.comentarios,
      };
      if (params?.id) {
        await fromUntyped("pjecalc_parametros").update(payload).eq("id", params.id);
      } else {
        await fromUntyped("pjecalc_parametros").insert(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] });
      toast.success("Parâmetros salvos!");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const completude = useMemo(() => {
    return calcularCompletude({
      params: formParams,
      faltas,
      ferias,
      historicos,
      verbas,
      cartaoPonto: [], // TODO: load cartao ponto for check
      resultado
    });
  }, [formParams, faltas, ferias, historicos, verbas, resultado]);

  const getStatusColor = (status: ModuleStatus) => {
    switch (status) {
      case 'validado': return 'bg-[hsl(var(--success))]';
      case 'preenchido': return 'bg-primary';
      case 'alerta': return 'bg-yellow-500';
      case 'incompleto': return 'bg-destructive';
      default: return 'bg-muted-foreground/30';
    }
  };

  const renderModule = () => {
    switch (activeModule) {
      // 1. Dados do Cálculo
      case 'dados_processo': return <ModuloDadosProcesso caseId={caseId} />;
      case 'parametros_gerais': return <ModuloParametrosGerais caseId={caseId} />;
      case 'advogados': return <ModuloAdvogados caseId={caseId} />;

      // 2. Períodos e Ponto
      case 'historico': return <ModuloHistoricoSalarial caseId={caseId} />;
      case 'faltas': return <ModuloFaltas caseId={caseId} />;
      case 'ferias': return <ModuloFerias caseId={caseId} />;
      case 'cartao_ponto': return <ModuloCartaoPonto caseId={caseId} dataAdmissao={formParams.data_admissao} dataDemissao={formParams.data_demissao} />;
      case 'cartao_ponto_diario': return <ModuloCartaoPontoDiario caseId={caseId} />;
      case 'excecoes_carga': return <ModuloExcecoesCarga caseId={caseId} />;
      case 'excecoes_sabado': return <ModuloExcecoesSabado caseId={caseId} />;

      // 3. Verbas e Ocorrências
      case 'verbas_cadastro': return <ModuloVerbasCadastro caseId={caseId} />;
      case 'ocorrencias': return (
        <Card className="rounded-sm border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Ocorrências</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            As ocorrências mensais são geradas e editadas diretamente dentro de cada verba (Cadastro de Verbas &gt; Editar &gt; Ocorrências).
          </CardContent>
        </Card>
      );
      case 'pagamentos': return <ModuloPagamentos caseId={caseId} />;
      case 'vale_transporte': return <ModuloValeTransporte caseId={caseId} />;

      // 4. Tributos
      case 'cs': return <ModuloCS caseId={caseId} />;
      case 'ir': return <ModuloIR caseId={caseId} />;
      case 'fgts': return <ModuloFGTS caseId={caseId} />;

      // 5. Outros Módulos
      case 'pensao': return <ModuloPensaoAlimenticia caseId={caseId} />;
      case 'prev_privada': return <ModuloPrevidenciaPrivada caseId={caseId} />;
      case 'salario_familia': return <ModuloSalarioFamilia caseId={caseId} />;
      case 'seguro_desemprego': return <ModuloSeguroDesemprego caseId={caseId} />;

      // 6. Ajustes Financeiros
      case 'multas': return <ModuloMultasCLT caseId={caseId} />;
      case 'honorarios': return <ModuloHonorarios caseId={caseId} />;
      case 'custas': return <ModuloCustas caseId={caseId} />;

      // 7. Atualização Monetária
      case 'correcao': return <ModuloCorrecao caseId={caseId} />;
      case 'atualizacao': return <ModuloAtualizacao caseId={caseId} />;
      case 'excecoes_juros': return <ModuloExcecoesJuros caseId={caseId} />;

      // 8. Resultado e Relatórios
      case 'resumo': return <ModuloResumo caseId={caseId} />;
      case 'ajuste_sentenca': return (
        <ModuloAjusteSentenca
          caseId={caseId}
          dataAdmissao={formParams.data_admissao}
          dataDemissao={formParams.data_demissao}
          cargaHoraria={formParams.carga_horaria_padrao}
        />
      );
      case 'guias_recolhimento': return resultado ? (
        <ModuloGuiasRecolhimento result={resultado as any} dadosProcesso={dadosProcesso as any} />
      ) : (
        <Card className="rounded-sm border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Guias de Recolhimento</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Execute uma liquidação no módulo Resumo para gerar guias GPS/DARF.</CardContent>
        </Card>
      );
      case 'esocial': return (
        <ModuloESocial
          caseId={caseId}
          resultado={(resultado as Record<string, unknown>) ?? null}
          dadosProcesso={dadosProcesso as any}
          params={{ data_admissao: formParams.data_admissao, data_demissao: formParams.data_demissao }}
        />
      );
      case 'danos_morais': return <ModuloDanosMorais caseId={caseId} />;
      case 'equiparacao': return <ModuloEquiparacaoSalarial caseId={caseId} />;
      case 'estabilidade': return <ModuloEstabilidade caseId={caseId} />;
      case 'periculosidade': return <ModuloPericulosidade caseId={caseId} />;
      case 'terceiros': return <ModuloTerceiros caseId={caseId} />;

      default: return null;
    }
  };

  // ── PARÂMETROS ──
  // Highlight de campos criticos ausentes (vinculado ao completeness score)
  // — campos marcados com "*" pintam a borda em amarelo quando vazios.
  const missingCritical = {
    estado: !formParams.estado,
    municipio: !formParams.municipio?.trim(),
    data_admissao: !formParams.data_admissao,
    data_ajuizamento: !formParams.data_ajuizamento,
    remuneracao: !formParams.maior_remuneracao && !formParams.ultima_remuneracao && historicos.length === 0,
  };
  const criticalCls = "border-yellow-400 ring-1 ring-yellow-400/40 bg-yellow-50/40 dark:bg-yellow-950/20";

  const renderParametros = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Parâmetros do Cálculo</h2>
        <Button onClick={saveParams} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>

      {/* Painel de revisão de auto-preenchimento — propostas geradas a
          partir dos documentos enviados. Apenas exibido quando ha
          propostas pendentes (componente faz a query interna). */}
      <AutoFillReviewPanel caseId={caseId} onAfterApply={() => {
        // Refetch dos parametros apos aplicar uma proposta.
        // Implementacao via React Query invalidation seria ideal mas
        // o useState/useEffect interno do PjeCalcInline ja captura
        // mudancas via supabase realtime indireto (saveParams call).
      }} />

      {(missingCritical.estado || missingCritical.municipio || missingCritical.data_admissao || missingCritical.data_ajuizamento || missingCritical.remuneracao) && (
        <Card className="border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-800 dark:text-yellow-200">Campos críticos pendentes</div>
              <div className="text-yellow-700 dark:text-yellow-300/80">
                Preencha os campos destacados em amarelo para liberar a liquidação.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Localização</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Estado *</Label>
            <Select value={formParams.estado} onValueChange={v => setFormParams(p => ({ ...p, estado: v }))}>
              <SelectTrigger className={cn("mt-1 h-8 text-xs", missingCritical.estado && criticalCls)}><SelectValue /></SelectTrigger>
              <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Município *</Label>
            <Input value={formParams.municipio} onChange={e => setFormParams(p => ({ ...p, municipio: e.target.value }))} className={cn("mt-1 h-8 text-xs", missingCritical.municipio && criticalCls)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datas do Contrato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label className="text-xs">Admissão *</Label><Input type="date" value={formParams.data_admissao} onChange={e => setFormParams(p => ({ ...p, data_admissao: e.target.value }))} className={cn("mt-1 h-8 text-xs", missingCritical.data_admissao && criticalCls)} /></div>
          <div><Label className="text-xs">Demissão</Label><Input type="date" value={formParams.data_demissao} onChange={e => setFormParams(p => ({ ...p, data_demissao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Ajuizamento *</Label><Input type="date" value={formParams.data_ajuizamento} onChange={e => setFormParams(p => ({ ...p, data_ajuizamento: e.target.value }))} className={cn("mt-1 h-8 text-xs", missingCritical.data_ajuizamento && criticalCls)} /></div>
          <div><Label className="text-xs">Data Inicial</Label><Input type="date" value={formParams.data_inicial} onChange={e => setFormParams(p => ({ ...p, data_inicial: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Prescrição</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={formParams.prescricao_quinquenal} onCheckedChange={v => setFormParams(p => ({ ...p, prescricao_quinquenal: !!v }))} /><Label className="text-xs">Aplicar Prescrição Quinquenal</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.prescricao_fgts} onCheckedChange={v => setFormParams(p => ({ ...p, prescricao_fgts: !!v }))} /><Label className="text-xs">Aplicar Prescrição FGTS</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Regime e Jornada</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Regime de Trabalho</Label>
            <Select value={formParams.regime_trabalho} onValueChange={v => setFormParams(p => ({ ...p, regime_trabalho: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tempo_integral">Tempo Integral</SelectItem>
                <SelectItem value="tempo_parcial">Tempo Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Carga Horária Mensal</Label><Input type="number" value={formParams.carga_horaria_padrao} onChange={e => setFormParams(p => ({ ...p, carga_horaria_padrao: parseInt(e.target.value) || 220 }))} className="mt-1 h-8 text-xs" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Remunerações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Maior Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.maior_remuneracao} onChange={e => setFormParams(p => ({ ...p, maior_remuneracao: e.target.value }))} className={cn("mt-1 h-8 text-xs", missingCritical.remuneracao && criticalCls)} placeholder="0,00" /></div>
          <div><Label className="text-xs">Última Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.ultima_remuneracao} onChange={e => setFormParams(p => ({ ...p, ultima_remuneracao: e.target.value }))} className={cn("mt-1 h-8 text-xs", missingCritical.remuneracao && criticalCls)} placeholder="0,00" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Aviso Prévio</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Prazo do Aviso Prévio</Label>
            <Select value={formParams.prazo_aviso_previo} onValueChange={v => setFormParams(p => ({ ...p, prazo_aviso_previo: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_apurar">Não Apurar</SelectItem>
                <SelectItem value="calculado">Calculado (Lei 12.506/2011)</SelectItem>
                <SelectItem value="informado">Informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formParams.prazo_aviso_previo === 'informado' && (
            <div><Label className="text-xs">Dias</Label><Input type="number" value={formParams.prazo_aviso_dias} onChange={e => setFormParams(p => ({ ...p, prazo_aviso_dias: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Opções</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={formParams.projetar_aviso_indenizado} onCheckedChange={v => setFormParams(p => ({ ...p, projetar_aviso_indenizado: !!v }))} /><Label className="text-xs">Projetar Aviso Prévio Indenizado</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.limitar_avos_periodo} onCheckedChange={v => setFormParams(p => ({ ...p, limitar_avos_periodo: !!v }))} /><Label className="text-xs">Limitar Avos ao Período do Cálculo</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.zerar_valor_negativo} onCheckedChange={v => setFormParams(p => ({ ...p, zerar_valor_negativo: !!v }))} /><Label className="text-xs">Zerar Valor Negativo</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.sabado_dia_util} onCheckedChange={v => setFormParams(p => ({ ...p, sabado_dia_util: !!v }))} /><Label className="text-xs">Sábado como Dia Útil</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.considerar_feriado_estadual} onCheckedChange={v => setFormParams(p => ({ ...p, considerar_feriado_estadual: !!v }))} /><Label className="text-xs">Considerar Feriado Estadual</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.considerar_feriado_municipal} onCheckedChange={v => setFormParams(p => ({ ...p, considerar_feriado_municipal: !!v }))} /><Label className="text-xs">Considerar Feriado Municipal</Label></div>
          <div>
            <Label className="text-xs">Tipo de Mês (Art. 64 CLT)</Label>
            <Select value={formParams.tipo_mes} onValueChange={v => setFormParams(p => ({ ...p, tipo_mes: v as 'comercial' | 'civil' }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comercial">Mês Comercial (30 dias fixos)</SelectItem>
                <SelectItem value="civil">Calendário Civil (dias reais)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Inline renderFaltas/renderFerias/renderHistorico movidos para ModuloFaltas/ModuloFerias/ModuloHistoricoSalarial.


  // ── VERBAS ──
  const [expandedVerbas, setExpandedVerbas] = useState<Set<string>>(new Set());
  const [editingVerba, setEditingVerba] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingVerba, setSavingVerba] = useState(false);

  const openEditVerba = (verba: any) => {
    setEditingVerba(verba);
    setEditForm({
      nome: verba.nome || '',
      multiplicador: verba.multiplicador ?? 1,
      divisor_informado: verba.divisor_informado ?? 30,
      tipo_divisor: verba.tipo_divisor || 'informado',
      tipo_quantidade: verba.tipo_quantidade || 'informada',
      fracao_mes_modo: verba.fracao_mes_modo || 'manter_fracao',
      comportamento_reflexo: verba.comportamento_reflexo || 'valor_mensal',
      hora_noturna_ficticia: verba.hora_noturna_ficticia ?? false,
      incide_fgts: verba.incide_fgts !== false,
      incide_inss: verba.incide_inss !== false,
      incide_ir: verba.incide_ir !== false,
      periodo_inicio: verba.periodo_inicio || '',
      periodo_fim: verba.periodo_fim || '',
    });
  };

  const saveEditVerba = async () => {
    if (!editingVerba) return;
    setSavingVerba(true);
    try {
      await fromUntyped("pjecalc_verbas").update({
        nome: editForm.nome,
        multiplicador: Number(editForm.multiplicador),
        divisor_informado: Number(editForm.divisor_informado),
        tipo_divisor: editForm.tipo_divisor,
        tipo_quantidade: editForm.tipo_quantidade,
        fracao_mes_modo: editForm.fracao_mes_modo,
        comportamento_reflexo: editingVerba.tipo === 'reflexa' ? editForm.comportamento_reflexo : undefined,
        hora_noturna_ficticia: editForm.hora_noturna_ficticia,
        incide_fgts: editForm.incide_fgts,
        incide_inss: editForm.incide_inss,
        incide_ir: editForm.incide_ir,
        periodo_inicio: editForm.periodo_inicio || null,
        periodo_fim: editForm.periodo_fim || null,
      }).eq("id", editingVerba.id);
      queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
      toast.success("Verba atualizada");
      setEditingVerba(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSavingVerba(false); }
  };

  const toggleExpand = useCallback((id: string) => {
    setExpandedVerbas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleReflexaAtiva = useCallback(async (reflexaId: string, currentAtiva: boolean) => {
    await fromUntyped("pjecalc_verbas").update({ ativa: !currentAtiva }).eq("id", reflexaId);
    queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
  }, [caseId, queryClient]);

  const expandAll = useCallback(() => {
    const ids = verbas.filter((v: any) => v.tipo === 'principal').map((v: any) => v.id);
    setExpandedVerbas(new Set(ids));
  }, [verbas]);

  const collapseAll = useCallback(() => setExpandedVerbas(new Set()), []);

  const renderVerbas = () => {
    const principals = verbas.filter((v: any) => v.tipo === 'principal');
    const getReflexas = (principalId: string) => verbas.filter((v: any) => v.tipo === 'reflexa' && v.verba_principal_id === principalId);
    const orphanReflexas = verbas.filter((v: any) => v.tipo === 'reflexa' && !v.verba_principal_id);

    return (
    <div className="space-y-4">
      {/* Header matching PJe-Calc layout */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Lançamento</span>
              <Button size="sm" onClick={async () => {
                const periodo = formParams.data_admissao && formParams.data_demissao
                  ? { inicio: formParams.data_admissao, fim: formParams.data_demissao }
                  : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
                await fromUntyped("pjecalc_verbas").insert({
                  case_id: caseId, nome: `Verba ${verbas.length + 1}`, tipo: 'principal',
                  periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length,
                });
                queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
              }}><Plus className="h-4 w-4 mr-1" /> Manual</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                const periodo = formParams.data_admissao && formParams.data_demissao
                  ? { inicio: formParams.data_admissao, fim: formParams.data_demissao }
                  : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
                const { data: principalData } = await fromUntyped("pjecalc_verbas").insert({
                  case_id: caseId, nome: 'Horas Extras 50%', caracteristica: 'comum', ocorrencia_pagamento: 'mensal',
                  tipo: 'principal', multiplicador: 1.5, divisor_informado: formParams.carga_horaria_padrao || 220,
                  periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length,
                }).select("id").single();
                const principalId = (principalData as Record<string, unknown>)?.id;
                if (principalId) {
                  const reflexas = [
                    { nome: '13º SALÁRIO SOBRE HORAS EXTRAS', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', multiplicador: 1, divisor_informado: 12 },
                    { nome: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', multiplicador: 1.3333, divisor_informado: 12 },
                    { nome: 'RSR E FERIADO SOBRE HORAS EXTRAS', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26 },
                    { nome: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12 },
                    { nome: 'MULTA DO ARTIGO 477 DA CLT SOBRE HORAS EXTRAS', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 1, ativa: false },
                  ];
                  for (let i = 0; i < reflexas.length; i++) {
                    const { ativa, ...rest } = reflexas[i] as any;
                    await fromUntyped("pjecalc_verbas").insert({
                      case_id: caseId, ...rest, tipo: 'reflexa',
                      periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
                      ordem: verbas.length + 1 + i,
                      verba_principal_id: principalId,
                      ativa: ativa ?? true,
                      base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
                    });
                  }
                }
                queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
                toast.success("Verba expressa com reflexas adicionada!");
              }}><Briefcase className="h-4 w-4 mr-1" /> Expresso</Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Registros encontrados: {principals.length}</span>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={expandAll}>
                <Check className="h-3 w-3 mr-1" /> Exibir Todas
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={collapseAll}>Ocultar Todas</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {principals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Use "Expresso" para incluir verbas comuns com reflexas ou "Manual" para criar manualmente.</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[32px_100px_1fr_120px] gap-1 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 rounded-t-lg border">
            <div></div>
            <div>Ações</div>
            <div className="text-center">Verba Principal</div>
            <div className="text-right">Verba Reflexa</div>
          </div>

          {principals.map((principal: any) => {
            const reflexas = getReflexas(principal.id);
            const isExpanded = expandedVerbas.has(principal.id);
            const activeReflexas = reflexas.filter((r: any) => r.ativa !== false);

            return (
              <div key={principal.id}>
                {/* Principal row */}
                <div className="grid grid-cols-[32px_100px_1fr_120px] gap-1 items-center px-3 py-2.5 border border-b-0 bg-card hover:bg-muted/30 transition-colors">
                  <Checkbox checked={false} className="h-4 w-4" />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicar"
                      onClick={async () => {
                        const periodo = { inicio: principal.periodo_inicio, fim: principal.periodo_fim };
                        const { data: newP } = await fromUntyped("pjecalc_verbas").insert({
                          case_id: caseId, nome: principal.nome + ' (cópia)', tipo: 'principal',
                          caracteristica: principal.caracteristica, ocorrencia_pagamento: principal.ocorrencia_pagamento,
                          multiplicador: principal.multiplicador, divisor_informado: principal.divisor_informado,
                          periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length,
                          incidencias: principal.incidencias,
                        }).select("id").single();
                        queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
                        if (newP) toast.success("Verba duplicada!");
                      }}>
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Editar" onClick={() => openEditVerba(principal)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Excluir"
                      onClick={async () => {
                        // Delete reflexas first, then principal
                        for (const r of reflexas) await fromUntyped("pjecalc_verbas").delete().eq("id", r.id);
                        await fromUntyped("pjecalc_verbas").delete().eq("id", principal.id);
                        queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
                      }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold">{principal.nome}</span>
                    <div className="text-[10px] text-muted-foreground">
                      ×{principal.multiplicador} ÷{principal.divisor_informado || 30} • {principal.ocorrencia_pagamento}
                    </div>
                  </div>
                  <div className="text-right">
                    <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0"
                      onClick={() => toggleExpand(principal.id)}>
                      {isExpanded ? '▾ Ocultar' : `▸ Exibir`}
                      <Badge variant="secondary" className="ml-1 text-[9px]">{activeReflexas.length}/{reflexas.length}</Badge>
                    </Button>
                  </div>
                </div>

                {/* Reflexas panel (expanded) */}
                {isExpanded && reflexas.length > 0 && (
                  <div className="border border-t-0 bg-muted/10">
                    {reflexas.map((ref: any) => {
                      const isActive = ref.ativa !== false;
                      return (
                        <div key={ref.id}
                          className={cn(
                            "grid grid-cols-[32px_60px_1fr_80px] gap-1 items-center px-3 py-2 border-b last:border-b-0 transition-colors",
                            isActive ? "bg-primary/5" : "bg-card opacity-60"
                          )}>
                          <Checkbox checked={false} className="h-4 w-4" />
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-5 w-5" title="Duplicar">
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" title="Editar" onClick={() => openEditVerba(ref)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isActive}
                              onCheckedChange={() => toggleReflexaAtiva(ref.id, isActive)}
                              className="h-4 w-4"
                            />
                            <span className={cn("text-sm", isActive ? "font-medium" : "text-muted-foreground line-through")}>{ref.nome}</span>
                          </div>
                          <div className="text-right">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={async () => {
                                await fromUntyped("pjecalc_verbas").delete().eq("id", ref.id);
                                queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
                              }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan reflexas */}
          {orphanReflexas.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-destructive font-medium mb-1">⚠ Reflexas sem verba principal:</div>
              {orphanReflexas.map((v: any) => (
                <div key={v.id} className="grid grid-cols-[32px_1fr_80px] gap-1 items-center px-3 py-2 border bg-destructive/5">
                  <Checkbox checked={false} className="h-4 w-4" />
                  <span className="text-sm">{v.nome}</span>
                  <div className="text-right">
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                      onClick={async () => {
                        await fromUntyped("pjecalc_verbas").delete().eq("id", v.id);
                        queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
                      }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Hierarchical sidebar — PJe-Calc style */}
        <aside className="w-full md:w-72 flex-shrink-0 border rounded-sm bg-card">
          <ScrollArea className="h-[650px]">
            <nav className="p-2 text-[13px]" aria-label="Navegação PJe-Calc">
              {SECOES.map(sec => {
                const SecIcon = sec.icon;
                const expanded = expandedSections.has(sec.id);
                const total = sec.modulos.length;
                return (
                  <div key={sec.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm",
                        "text-left font-semibold uppercase tracking-wide text-[11px]",
                        "text-foreground hover:bg-muted transition-colors"
                      )}
                      aria-expanded={expanded}
                    >
                      {expanded
                        ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
                      <SecIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1">{sec.label}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">{total}</span>
                    </button>
                    {expanded && (
                      <ul className="mt-0.5 ml-1 border-l border-border">
                        {sec.modulos.map(m => {
                          const Icon = m.icon;
                          const active = activeModule === m.id;
                          const status = completude[m.id] || 'nao_iniciado';
                          return (
                            <li key={m.id}>
                              <button
                                type="button"
                                onClick={() => setActiveModule(m.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-sm",
                                  "text-[13px] transition-colors",
                                  active
                                    ? "bg-[hsl(var(--primary))] text-primary-foreground font-medium"
                                    : "hover:bg-muted text-foreground/80 hover:text-foreground"
                                )}
                                aria-current={active ? 'page' : undefined}
                              >
                                <Icon className={cn(
                                  "h-3.5 w-3.5 flex-shrink-0",
                                  active ? "" : "text-muted-foreground"
                                )} />
                                <span className="flex-1 text-left truncate">{m.label}</span>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                  getStatusColor(status)
                                )} aria-hidden />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 border rounded-sm bg-card">
          <ScrollArea className="h-[650px]">
            <div className="p-4 pb-8">
              {renderModule()}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* ── Modal de Edição de Verba ── */}
      <Dialog open={!!editingVerba} onOpenChange={open => { if (!open) setEditingVerba(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Verba — {editingVerba?.tipo === 'reflexa' ? 'Reflexa' : 'Principal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input className="mt-1 h-8 text-sm" value={editForm.nome || ''} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Multiplicador</Label>
                <Input type="number" step="0.0001" className="mt-1 h-8 text-sm" value={editForm.multiplicador ?? 1} onChange={e => setEditForm(f => ({ ...f, multiplicador: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Divisor</Label>
                <Input type="number" step="1" className="mt-1 h-8 text-sm" value={editForm.divisor_informado ?? 30} onChange={e => setEditForm(f => ({ ...f, divisor_informado: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo Divisor</Label>
                <Select value={editForm.tipo_divisor || 'informado'} onValueChange={v => setEditForm(f => ({ ...f, tipo_divisor: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informado">Valor informado</SelectItem>
                    <SelectItem value="jornada">Jornada contratual</SelectItem>
                    <SelectItem value="mensal">Mensal (220h)</SelectItem>
                    <SelectItem value="diario">Diário (30d)</SelectItem>
                    <SelectItem value="hora">Hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo Quantidade</Label>
                <Select value={editForm.tipo_quantidade || 'informada'} onValueChange={v => setEditForm(f => ({ ...f, tipo_quantidade: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informada">Informada</SelectItem>
                    <SelectItem value="avos">Avos (avos/12)</SelectItem>
                    <SelectItem value="calendario">Calendário (dias)</SelectItem>
                    <SelectItem value="repousos">Repousos (DSR)</SelectItem>
                    <SelectItem value="cartao_horas">Cartão — Horas</SelectItem>
                    <SelectItem value="cartao_dias">Cartão — Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mês Fracionário</Label>
                <Select value={editForm.fracao_mes_modo || 'manter_fracao'} onValueChange={v => setEditForm(f => ({ ...f, fracao_mes_modo: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manter_fracao">Manter fração</SelectItem>
                    <SelectItem value="integralizar">Integralizar</SelectItem>
                    <SelectItem value="desprezar">Desprezar</SelectItem>
                    <SelectItem value="desprezar_menor_15">Desprezar &lt;15d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingVerba?.tipo === 'reflexa' && (
                <div>
                  <Label className="text-xs">Comportamento Reflexo</Label>
                  <Select value={editForm.comportamento_reflexo || 'valor_mensal'} onValueChange={v => setEditForm(f => ({ ...f, comportamento_reflexo: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor_mensal">Valor mensal</SelectItem>
                      <SelectItem value="media_valor_absoluto">Média absoluta</SelectItem>
                      <SelectItem value="media_pela_quantidade">Média / quantidade</SelectItem>
                      <SelectItem value="media_valor_corrigido">Média corrigida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Período Início</Label>
                <Input type="date" className="mt-1 h-8 text-xs" value={editForm.periodo_inicio || ''} onChange={e => setEditForm(f => ({ ...f, periodo_inicio: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Período Fim</Label>
                <Input type="date" className="mt-1 h-8 text-xs" value={editForm.periodo_fim || ''} onChange={e => setEditForm(f => ({ ...f, periodo_fim: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Incidências</Label>
              <div className="flex gap-4">
                {[['incide_fgts','FGTS'],['incide_inss','INSS'],['incide_ir','IR']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={!!editForm[key]} onCheckedChange={v => setEditForm(f => ({ ...f, [key]: !!v }))} />
                    <span className="text-xs">{label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={!!editForm.hora_noturna_ficticia} onCheckedChange={v => setEditForm(f => ({ ...f, hora_noturna_ficticia: !!v }))} />
                  <span className="text-xs">Hora Noturna Fictícia (52,5min)</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingVerba(null)}>Cancelar</Button>
            <Button size="sm" onClick={saveEditVerba} disabled={savingVerba}>
              {savingVerba ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
