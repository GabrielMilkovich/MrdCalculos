import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { usePjeCalculator } from "@/hooks/usePjeCalculator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Save, Play, FileText, Calendar, Clock, Users,
  Briefcase, DollarSign, Shield, Calculator, BarChart3, Printer,
  ChevronRight, Check, AlertTriangle, Plus, Trash2, Loader2,
  Building2, Receipt, Scale, Percent, TrendingUp, FileBarChart,
  Eye, GitCompareArrows, ClipboardCheck, History, MessageSquare,
  Lightbulb, XCircle, CheckCircle2, Info, Search, MapPin, Bus,
} from "lucide-react";

// Module components
import { ModuloFGTS } from "@/components/cases/pjecalc/ModuloFGTS";
import { ModuloCS } from "@/components/cases/pjecalc/ModuloCS";
import { ModuloIR } from "@/components/cases/pjecalc/ModuloIR";
import { ModuloCorrecao } from "@/components/cases/pjecalc/ModuloCorrecao";
import { ModuloResumo } from "@/components/cases/pjecalc/ModuloResumo";
import { ModuloCartaoPontoDiario } from "@/components/cases/pjecalc/ModuloCartaoPontoDiario";
import { ModuloSeguroDesemprego } from "@/components/cases/pjecalc/ModuloSeguroDesemprego";
import { ModuloHonorarios } from "@/components/cases/pjecalc/ModuloHonorarios";
import { ModuloCustas } from "@/components/cases/pjecalc/ModuloCustas";
import { ModuloMultasCLT } from "@/components/cases/pjecalc/ModuloMultasCLT";
import { ModuloSalarioFamilia } from "@/components/cases/pjecalc/ModuloSalarioFamilia";
import { ModuloPensaoAlimenticia } from "@/components/cases/pjecalc/ModuloPensaoAlimenticia";
import { GradeOcorrencias } from "@/components/cases/pjecalc/GradeOcorrencias";
import { CatalogoVerbas } from "@/components/cases/pjecalc/CatalogoVerbas";
import { ModuloDadosProcesso } from "@/components/cases/pjecalc/ModuloDadosProcesso";
import { ModuloPrevidenciaPrivada } from "@/components/cases/pjecalc/ModuloPrevidenciaPrivada";
import { ModuloTabelasRegionais } from "@/components/cases/pjecalc/ModuloTabelasRegionais";
import { ExcecoesSabado } from "@/components/cases/pjecalc/ExcecoesSabado";
import { PerfilAcesso, type PerfilTipo } from "@/components/cases/pjecalc/PerfilAcesso";
import { WizardCalculo } from "@/components/cases/pjecalc/WizardCalculo";
import { ModuloPericulosidade } from "@/components/cases/pjecalc/ModuloPericulosidade";
import { ModuloDanosMorais } from "@/components/cases/pjecalc/ModuloDanosMorais";
import { ModuloEquiparacaoSalarial } from "@/components/cases/pjecalc/ModuloEquiparacaoSalarial";
import { ModuloEstabilidade } from "@/components/cases/pjecalc/ModuloEstabilidade";
import { EvolucaoDebito } from "@/components/cases/pjecalc/EvolucaoDebito";
import { ExportacaoUnificada } from "@/components/cases/pjecalc/ExportacaoUnificada";
import { ModuloGuiasRecolhimento } from "@/components/cases/pjecalc/ModuloGuiasRecolhimento";
import { ModuloTerceiros } from "@/components/cases/pjecalc/ModuloTerceiros";
import { ClassificacaoPrecatorio } from "@/components/cases/pjecalc/ClassificacaoPrecatorio";
import { SeletorTRT } from "@/components/cases/pjecalc/SeletorTRT";

// Phase 4 components
import { VerbaPreview } from "@/components/cases/pjecalc/VerbaPreview";
import { PainelRevisao } from "@/components/cases/pjecalc/PainelRevisao";
import { DashboardProdutividade } from "@/components/cases/pjecalc/DashboardProdutividade";
import { AuditLog } from "@/components/cases/pjecalc/AuditLog";
import { ObservacoesModulo } from "@/components/cases/pjecalc/ObservacoesModulo";
import { ModuloValeTransporte } from "@/components/cases/pjecalc/ModuloValeTransporte";
import { ModuloAdvogados } from "@/components/cases/pjecalc/ModuloAdvogados";
import { ModuloExcecoesJuros } from "@/components/cases/pjecalc/ModuloExcecoesJuros";
import { AssistenteContextual } from "@/components/cases/pjecalc/AssistenteContextual";
import { ImportadorFichaFinanceira } from "@/components/cases/pjecalc/ImportadorFichaFinanceira";
import { MemoriaCalculoExpandida } from "@/components/cases/pjecalc/MemoriaCalculoExpandida";
import { ModuloAjusteSentenca } from "@/components/cases/pjecalc/ModuloAjusteSentenca";
import { ModuloESocial } from "@/components/cases/pjecalc/ModuloESocial";
import { ComparacaoCenarios } from "@/components/cases/pjecalc/ComparacaoCenarios";
import { FidelidadePanel } from "@/components/cases/pjecalc/FidelidadePanel";
import { ModuloAtualizacao } from "@/components/cases/pjecalc/ModuloAtualizacao";
import { AuditAgentPanel } from "@/components/cases/pjecalc/AuditAgentPanel";
import { getRastreabilidadeGeral, type ModuleStatus } from "@/lib/pjecalc/completude";

import type { PjecalcFaltaRow, PjecalcFeriasRow, PjecalcVerbaRow } from "@/lib/pjecalc/types";

// =====================================================
// CONSTANTS
// =====================================================

const MODULOS = [
  { id: 'dados_processo', label: 'Dados do Processo', icon: Briefcase, desc: 'Identificação processual' },
  { id: 'seletor_trt', label: 'Seletor TRT', icon: MapPin, desc: 'Configuração regional' },
  { id: 'parametros', label: 'Parâmetros', icon: Calendar, desc: 'Dados do cálculo' },
  { id: 'faltas', label: 'Faltas', icon: Clock, desc: 'Registros de ausência' },
  { id: 'ferias', label: 'Férias', icon: Calendar, desc: 'Períodos aquisitivos' },
  { id: 'historico', label: 'Histórico Salarial', icon: DollarSign, desc: 'Bases de cálculo' },
  { id: 'cartao_ponto', label: 'Cartão de Ponto', icon: Clock, desc: 'Jornada mensal' },
  { id: 'ajuste_sentenca', label: 'Ajustes Sentença', icon: Scale, desc: 'Motor de ajuste de jornada' },
  { id: 'verbas', label: 'Verbas', icon: FileText, desc: 'Parcelas do cálculo' },
  { id: 'periculosidade', label: 'Periculosidade', icon: AlertTriangle, desc: 'Adicional 30%' },
  { id: 'danos_morais', label: 'Danos Morais', icon: Scale, desc: 'Indenização Art. 223-G' },
  { id: 'equiparacao', label: 'Equiparação Salarial', icon: GitCompareArrows, desc: 'Art. 461 CLT' },
  { id: 'estabilidade', label: 'Estabilidade', icon: Shield, desc: 'Provisória / Gestante / CIPA' },
  { id: 'fgts', label: 'FGTS', icon: Building2, desc: 'Depósitos e multa' },
  { id: 'cs', label: 'Contrib. Social', icon: Receipt, desc: 'Segurado e empregador' },
  { id: 'terceiros', label: 'Terceiros', icon: Building2, desc: 'Sistema S / FPAS' },
  { id: 'guias', label: 'Guias Recolhimento', icon: Receipt, desc: 'GPS e DARF' },
  { id: 'ir', label: 'Imposto de Renda', icon: Percent, desc: 'IRRF / RRA' },
  { id: 'correcao', label: 'Correção/Juros', icon: TrendingUp, desc: 'Atualização monetária' },
  { id: 'seguro', label: 'Seguro-Desemprego', icon: Shield, desc: 'Indenização substitutiva' },
  { id: 'salario_familia', label: 'Salário-Família', icon: Users, desc: 'Cotas por dependente' },
  { id: 'multas', label: 'Multas CLT', icon: AlertTriangle, desc: 'Art. 467 e 477' },
  { id: 'pensao', label: 'Pensão Alimentícia', icon: Scale, desc: 'Desconto judicial' },
  { id: 'prev_privada', label: 'Prev. Privada', icon: Shield, desc: 'Complementar' },
  { id: 'vale_transporte', label: 'Vale Transporte', icon: Bus, desc: 'Linhas e desconto' },
  { id: 'advogados', label: 'Advogados', icon: Users, desc: 'OAB e representação' },
  { id: 'excecoes_juros', label: 'Exceções Juros', icon: Scale, desc: 'Períodos com regime diferente' },
  { id: 'honorarios', label: 'Honorários', icon: Scale, desc: 'Sucumbenciais e contratuais' },
  { id: 'custas', label: 'Custas', icon: Receipt, desc: 'Custas processuais' },
  { id: 'atualizacao', label: 'Atualização', icon: TrendingUp, desc: 'Atualização pós-pagamento' },
  { id: 'resumo', label: 'Resumo', icon: FileBarChart, desc: 'Resultado da liquidação' },
  { id: 'evolucao_debito', label: 'Evolução do Débito', icon: TrendingUp, desc: 'Gráfico mensal do débito' },
  { id: 'exportacao', label: 'Exportação', icon: FileBarChart, desc: 'PDF, Excel e .PJC (XML)' },
  { id: 'fidelidade', label: 'Fidelidade/Paridade', icon: GitCompareArrows, desc: 'Auditoria PJC vs Engine' },
  { id: 'esocial', label: 'eSocial', icon: Building2, desc: 'Exportação S-2500/S-2501' },
  { id: 'tabelas_regionais', label: 'Tabelas Regionais', icon: MapPin, desc: 'Pisos, VT e Sal. Família' },
  { id: 'memoria', label: 'Memória de Cálculo', icon: FileText, desc: 'Detalhamento linha a linha' },
  { id: 'comparacao', label: 'Comparar Cenários', icon: GitCompareArrows, desc: 'Lado a lado' },
  { id: 'revisao', label: 'Revisão Técnica', icon: ClipboardCheck, desc: 'Conferência final' },
  { id: 'rastreabilidade', label: 'Rastreabilidade', icon: Scale, desc: 'Fundamentos jurídicos' },
  { id: 'auditoria', label: 'Auditoria', icon: History, desc: 'Trilha de alterações' },
  { id: 'dashboard', label: 'Produtividade', icon: BarChart3, desc: 'Métricas e indicadores' },
  { id: 'ai_audit', label: 'Auditoria IA', icon: Lightbulb, desc: 'Agente de auditoria inteligente' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const STATUS_CONFIG: Record<ModuleStatus, { icon: typeof Check | null; color: string; bg: string }> = {
  nao_iniciado: { icon: null, color: 'text-muted-foreground/40', bg: '' },
  incompleto: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  preenchido: { icon: Check, color: 'text-primary', bg: 'bg-primary/10' },
  alerta: { icon: AlertTriangle, color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
  validado: { icon: CheckCircle2, color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
};

// =====================================================
// PAGE COMPONENT
// =====================================================

export default function PjeCalcPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('parametros');
  const [selectedVerbaForGrid, setSelectedVerbaForGrid] = useState<PjecalcVerbaRow | null>(null);
  const [previewVerbaId, setPreviewVerbaId] = useState<string | null>(null);
  const [verbaSearch, setVerbaSearch] = useState('');
  const [verbaFilterTipo, setVerbaFilterTipo] = useState<'all' | 'principal' | 'reflexa'>('all');
  const [verbaFilterCarac, setVerbaFilterCarac] = useState<string>('all');
  const [expandedFeriasId, setExpandedFeriasId] = useState<string | null>(null);
  const [perfilAcesso, setPerfilAcesso] = useState<PerfilTipo>('perito');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTrtId, setSelectedTrtId] = useState<number | null>(null);

  // =====================================================
  // ALL DATA VIA HOOK — zero direct supabase access
  // =====================================================
  const calc = usePjeCalculator(caseId);

  // =====================================================
  // LOCAL FORM STATE (synced from hook data)
  // =====================================================
  const [formParams, setFormParams] = useState({
    estado: 'SP', municipio: '', data_admissao: '', data_demissao: '',
    data_ajuizamento: '', data_citacao: '', data_inicial: '', data_final: '',
    data_liquidacao: '',
    prescricao_quinquenal: false, prescricao_fgts: false,
    regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
    maior_remuneracao: '', ultima_remuneracao: '',
    prazo_aviso_previo: 'nao_apurar', prazo_aviso_dias: '',
    projetar_aviso_indenizado: false, limitar_avos_periodo: false,
    zerar_valor_negativo: false, sabado_dia_util: true,
    considerar_feriado_estadual: false, considerar_feriado_municipal: false,
    pontos_facultativos: [] as string[],
    tipo_mes: 'civil' as 'civil' | 'comercial',
    comentarios: '',
  });

  useEffect(() => {
    if (calc.params) {
      // calc.params tem tipo gerado, mas alguns campos extras (data_citacao,
      // data_liquidacao, pontos_facultativos, tipo_mes) ainda não foram
      // regenerados em src/integrations/supabase/types.ts. Acessamos via
      // narrow Record<string, unknown> em vez de `as any`.
      const extra = calc.params as unknown as Record<string, unknown>;
      setFormParams({
        estado: calc.params.estado || 'SP',
        municipio: calc.params.municipio || '',
        data_admissao: calc.params.data_admissao || '',
        data_demissao: calc.params.data_demissao || '',
        data_ajuizamento: calc.params.data_ajuizamento || '',
        data_citacao: (typeof extra.data_citacao === 'string' ? extra.data_citacao : '') || '',
        data_inicial: calc.params.data_inicial || '',
        data_final: calc.params.data_final || '',
        data_liquidacao: (typeof extra.data_liquidacao === 'string' ? extra.data_liquidacao : '') || '',
        prescricao_quinquenal: calc.params.prescricao_quinquenal || false,
        prescricao_fgts: calc.params.prescricao_fgts || false,
        regime_trabalho: calc.params.regime_trabalho || 'tempo_integral',
        carga_horaria_padrao: calc.params.carga_horaria_padrao || 220,
        maior_remuneracao: calc.params.maior_remuneracao?.toString() || '',
        ultima_remuneracao: calc.params.ultima_remuneracao?.toString() || '',
        prazo_aviso_previo: calc.params.prazo_aviso_previo || 'nao_apurar',
        prazo_aviso_dias: calc.params.prazo_aviso_dias?.toString() || '',
        projetar_aviso_indenizado: calc.params.projetar_aviso_indenizado || false,
        limitar_avos_periodo: calc.params.limitar_avos_periodo || false,
        zerar_valor_negativo: calc.params.zerar_valor_negativo || false,
        sabado_dia_util: calc.params.sabado_dia_util ?? true,
        considerar_feriado_estadual: calc.params.considerar_feriado_estadual || false,
        considerar_feriado_municipal: calc.params.considerar_feriado_municipal || false,
        pontos_facultativos: (Array.isArray(extra.pontos_facultativos) ? extra.pontos_facultativos : []) as string[],
        tipo_mes: ((typeof extra.tipo_mes === 'string' ? extra.tipo_mes : 'civil')) as 'civil' | 'comercial',
        comentarios: calc.params.comentarios || '',
      });
    }
  }, [calc.params]);

  // =====================================================
  // SAVE PARAMS — via hook mutation
  // =====================================================
  const handleSaveParams = async () => {
    await new Promise<void>((resolve, reject) => {
      calc.saveParams.mutate({
      case_id: caseId!,
      estado: formParams.estado,
      municipio: formParams.municipio,
      data_admissao: formParams.data_admissao,
      data_demissao: formParams.data_demissao || undefined,
      data_ajuizamento: formParams.data_ajuizamento,
      data_citacao: formParams.data_citacao || undefined,
      data_inicial: formParams.data_inicial || undefined,
      data_final: formParams.data_final || undefined,
      data_liquidacao: formParams.data_liquidacao || undefined,
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
      pontos_facultativos: formParams.pontos_facultativos,
      tipo_mes: formParams.tipo_mes,
      comentarios: formParams.comentarios,
    } as Record<string, unknown>, { onSuccess: () => resolve(), onError: (e: Error) => reject(e) });
    });
  };

  // =====================================================
  // AUTO-SAVE — debounced save of form params
  // =====================================================
  const autoSaveFn = useCallback(async () => {
    if (!caseId || !formParams.data_admissao) return;
    await new Promise<void>((resolve, reject) => {
      calc.saveParams.mutate({
        case_id: caseId,
        estado: formParams.estado,
        municipio: formParams.municipio,
        data_admissao: formParams.data_admissao,
        data_demissao: formParams.data_demissao || undefined,
        data_ajuizamento: formParams.data_ajuizamento,
        data_citacao: formParams.data_citacao || undefined,
        data_inicial: formParams.data_inicial || undefined,
        data_final: formParams.data_final || undefined,
        data_liquidacao: formParams.data_liquidacao || undefined,
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
      } as Record<string, unknown>, { onSuccess: () => resolve(), onError: (e: Error) => reject(e) });
    });
  }, [caseId, formParams, calc.saveParams]);

  const { isSaving: isAutoSaving, lastSaved: autoSaveLastSaved } = useAutoSave(formParams, autoSaveFn, 1500);

  // =====================================================
  // RENDER MODULES
  // =====================================================
  const renderModule = () => {
    if (selectedVerbaForGrid) {
      return <GradeOcorrencias
        caseId={caseId!} verbaId={selectedVerbaForGrid.id}
        verbaNome={selectedVerbaForGrid.nome}
        periodoInicio={selectedVerbaForGrid.periodo_inicio ?? undefined}
        periodoFim={selectedVerbaForGrid.periodo_fim ?? undefined}
        onClose={() => setSelectedVerbaForGrid(null)}
      />;
    }

    const moduleContent = (() => {
      if (showWizard) {
        return <WizardCalculo caseId={caseId!} onComplete={() => setShowWizard(false)} onExit={() => setShowWizard(false)} />;
      }
      switch (activeModule) {
        case 'dados_processo': return <ModuloDadosProcesso caseId={caseId!} />;
        case 'seletor_trt': return <SeletorTRT selectedTrtId={selectedTrtId} onSelect={(trtId, defaults) => { setSelectedTrtId(trtId); if (defaults) { setFormParams(p => ({ ...p, ...defaults })); } }} />;
        case 'parametros': return renderParametros();
        case 'faltas': return renderFaltas();
        case 'ferias': return renderFerias();
        case 'historico': return renderHistorico();
        case 'cartao_ponto': return <ModuloCartaoPontoDiario caseId={caseId!} dataAdmissao={formParams.data_admissao} dataDemissao={formParams.data_demissao} cargaHoraria={formParams.carga_horaria_padrao} />;
        case 'ajuste_sentenca': return <ModuloAjusteSentenca caseId={caseId!} dataAdmissao={formParams.data_admissao} dataDemissao={formParams.data_demissao} cargaHoraria={formParams.carga_horaria_padrao} />;
        case 'verbas': return renderVerbas();
        case 'periculosidade': return <ModuloPericulosidade caseId={caseId!} />;
        case 'danos_morais': return <ModuloDanosMorais caseId={caseId!} />;
        case 'equiparacao': return <ModuloEquiparacaoSalarial caseId={caseId!} />;
        case 'estabilidade': return <ModuloEstabilidade caseId={caseId!} />;
        case 'fgts': return <ModuloFGTS caseId={caseId!} />;
        case 'cs': return <ModuloCS caseId={caseId!} />;
        case 'terceiros': return <ModuloTerceiros caseId={caseId!} />;
        case 'guias': return calc.rawResultado?.resultado ? <ModuloGuiasRecolhimento result={calc.rawResultado.resultado as any} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Execute a liquidação primeiro.</CardContent></Card>;
        case 'ir': return <ModuloIR caseId={caseId!} />;
        case 'correcao': return <ModuloCorrecao caseId={caseId!} />;
        case 'seguro': return <ModuloSeguroDesemprego caseId={caseId!} />;
        case 'salario_familia': return <ModuloSalarioFamilia caseId={caseId!} />;
        case 'multas': return <ModuloMultasCLT caseId={caseId!} />;
        case 'pensao': return <ModuloPensaoAlimenticia caseId={caseId!} />;
        case 'vale_transporte': return <ModuloValeTransporte caseId={caseId!} />;
        case 'advogados': return <ModuloAdvogados caseId={caseId!} />;
        case 'excecoes_juros': return <ModuloExcecoesJuros caseId={caseId!} />;
        case 'honorarios': return <ModuloHonorarios caseId={caseId!} />;
        case 'prev_privada': return <ModuloPrevidenciaPrivada caseId={caseId!} />;
        case 'custas': return <ModuloCustas caseId={caseId!} />;
        case 'atualizacao': return <ModuloAtualizacao caseId={caseId!} />;
        case 'resumo': return (<>
            <ModuloResumo caseId={caseId!} onBeforeLiquidar={async () => { await handleSaveParams(); }} />
            {calc.rawResultado?.resultado && (calc.correcaoConfig as Record<string, unknown>)?.ente_publico && (
              <ClassificacaoPrecatorio resumo={(calc.rawResultado.resultado as Record<string, unknown>).resumo} />
            )}
          </>);
        case 'evolucao_debito': return calc.rawResultado?.resultado ? <EvolucaoDebito result={calc.rawResultado.resultado as any} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Execute a liquidação primeiro.</CardContent></Card>;
        case 'exportacao': return calc.rawResultado?.resultado ? <ExportacaoUnificada result={calc.rawResultado.resultado as any} params={formParams as any} verbas={calc.verbas as any} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Execute a liquidação primeiro.</CardContent></Card>;
        case 'fidelidade':
          return calc.rawResultado?.resultado
            ? <FidelidadePanel
                fidelityReport={(calc.rawResultado as Record<string, unknown>).fidelityReport || null}
                parityReport={(calc.rawResultado as Record<string, unknown>).parityReport || null}
              />
            : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Execute a liquidacao primeiro para ver o relatorio de fidelidade.</CardContent></Card>;
        case 'esocial': return <ModuloESocial caseId={caseId!} resultado={(calc.rawResultado?.resultado || null) as any} params={formParams} />;
        case 'tabelas_regionais': return <ModuloTabelasRegionais caseId={caseId!} estado={formParams.estado} municipio={formParams.municipio} />;
        case 'memoria': return calc.rawResultado?.resultado ? <MemoriaCalculoExpandida resultado={calc.rawResultado.resultado as any} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Execute a liquidação primeiro.</CardContent></Card>;
        case 'comparacao': return <ComparacaoCenarios caseId={caseId!} />;
        case 'revisao': return <PainelRevisao caseId={caseId!} validacao={null} resultado={(calc.rawResultado?.resultado || null) as any} modulosStatus={calc.completude} />;
        case 'rastreabilidade': return renderRastreabilidade();
        case 'auditoria': return <AuditLog caseId={caseId!} />;
        case 'dashboard': return <DashboardProdutividade />;
        case 'ai_audit': return <AuditAgentPanel caseId={caseId!} calculoId={(calc as Record<string, unknown>).calculoId} />;
        default: return null;
      }
    })();

    const showAssistant = !['memoria', 'comparacao', 'revisao', 'rastreabilidade', 'auditoria', 'dashboard', 'ai_audit'].includes(activeModule);

    return (
      <div>
        {showAssistant && (
          <AssistenteContextual
            modulo={activeModule}
            params={formParams}
            hasHistorico={calc.historicos.length > 0}
            hasVerbas={calc.verbas.length > 0}
            hasFaltas={calc.faltas.length > 0}
            hasFerias={calc.ferias.length > 0}
          />
        )}
        {moduleContent}
        {showAssistant && <ObservacoesModulo caseId={caseId!} modulo={activeModule} />}
      </div>
    );
  };

  // =====================================================
  // RASTREABILIDADE
  // =====================================================
  const renderRastreabilidade = () => {
    const items = getRastreabilidadeGeral();
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Rastreabilidade Jurídica
        </h2>
        <p className="text-xs text-muted-foreground">Fundamentos legais aplicados em cada componente do cálculo.</p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-start gap-3">
                <Badge variant={item.tipo === 'legal' ? 'default' : 'secondary'} className="text-[10px] mt-0.5 flex-shrink-0">
                  {item.tipo === 'legal' ? 'Lei' : item.tipo === 'parametrizado' ? 'Param.' : 'Sist.'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{item.componente}</div>
                  <div className="text-[10px] text-muted-foreground">{item.fundamento}</div>
                  {item.vigencia && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">Vigência: {item.vigencia}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{item.artigo}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // =====================================================
  // PARÂMETROS
  // =====================================================
  const renderParametros = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Parâmetros do Cálculo</h2>
          {isAutoSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          )}
          {!isAutoSaving && autoSaveLastSaved && (
            <span className="text-xs text-muted-foreground">
              Salvo {autoSaveLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <Button onClick={handleSaveParams} disabled={calc.saveParams.isPending} size="sm">
          {calc.saveParams.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Localização</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Estado *</Label>
            <Select value={formParams.estado} onValueChange={v => setFormParams(p => ({ ...p, estado: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Município *</Label>
            <Input value={formParams.municipio} onChange={e => setFormParams(p => ({ ...p, municipio: e.target.value }))} className="mt-1 h-8 text-xs" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datas do Contrato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label className="text-xs">Admissão *</Label><Input type="date" value={formParams.data_admissao} onChange={e => setFormParams(p => ({ ...p, data_admissao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Demissão</Label><Input type="date" value={formParams.data_demissao} onChange={e => setFormParams(p => ({ ...p, data_demissao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Data Inicial (Período)</Label><Input type="date" value={formParams.data_inicial} onChange={e => setFormParams(p => ({ ...p, data_inicial: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Data Final (Período)</Label><Input type="date" value={formParams.data_final} onChange={e => setFormParams(p => ({ ...p, data_final: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datas Processuais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><Label className="text-xs">Ajuizamento *</Label><Input type="date" value={formParams.data_ajuizamento} onChange={e => setFormParams(p => ({ ...p, data_ajuizamento: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Citação *</Label>
            <Input type="date" value={formParams.data_citacao} onChange={e => setFormParams(p => ({ ...p, data_citacao: e.target.value }))} className="mt-1 h-8 text-xs" />
            <p className="text-[9px] text-muted-foreground mt-0.5">Obrigatório para ADC 58 (transição IPCA-E → SELIC)</p>
          </div>
          <div>
            <Label className="text-xs">Liquidação *</Label>
            <Input type="date" value={formParams.data_liquidacao} onChange={e => setFormParams(p => ({ ...p, data_liquidacao: e.target.value }))} className="mt-1 h-8 text-xs" />
            <p className="text-[9px] text-muted-foreground mt-0.5">Data base para correção monetária e juros</p>
          </div>
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
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Regime de Trabalho</Label>
            <Select value={formParams.regime_trabalho} onValueChange={v => setFormParams(p => ({ ...p, regime_trabalho: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="tempo_integral">Tempo Integral</SelectItem><SelectItem value="tempo_parcial">Tempo Parcial</SelectItem><SelectItem value="intermitente">Trabalho Intermitente</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Carga Horária Mensal</Label><Input type="number" value={formParams.carga_horaria_padrao} onChange={e => setFormParams(p => ({ ...p, carga_horaria_padrao: parseInt(e.target.value) || 220 }))} className="mt-1 h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Tipo de Mês</Label>
            <Select value={formParams.tipo_mes} onValueChange={(v: 'civil' | 'comercial') => setFormParams(p => ({ ...p, tipo_mes: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="civil">Civil (dias reais)</SelectItem>
                <SelectItem value="comercial">Comercial (30 dias — Art. 64 CLT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Remunerações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Maior Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.maior_remuneracao} onChange={e => setFormParams(p => ({ ...p, maior_remuneracao: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="0,00" /></div>
          <div><Label className="text-xs">Última Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.ultima_remuneracao} onChange={e => setFormParams(p => ({ ...p, ultima_remuneracao: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="0,00" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Aviso Prévio</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Prazo do Aviso Prévio</Label>
            <Select value={formParams.prazo_aviso_previo} onValueChange={v => setFormParams(p => ({ ...p, prazo_aviso_previo: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nao_apurar">Não Apurar</SelectItem><SelectItem value="calculado">Calculado (Lei 12.506/2011)</SelectItem><SelectItem value="informado">Informado</SelectItem></SelectContent>
            </Select>
          </div>
          {formParams.prazo_aviso_previo === 'informado' && <div><Label className="text-xs">Dias</Label><Input type="number" value={formParams.prazo_aviso_dias} onChange={e => setFormParams(p => ({ ...p, prazo_aviso_dias: e.target.value }))} className="mt-1 h-8 text-xs" /></div>}
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Pontos Facultativos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { value: 'sexta_santa', label: 'Sexta-feira Santa' },
            { value: 'carnaval', label: 'Carnaval' },
            { value: 'corpus_christi', label: 'Corpus Christi' },
          ].map(pf => (
            <div key={pf.value} className="flex items-center gap-2">
              <Checkbox
                checked={formParams.pontos_facultativos.includes(pf.value)}
                onCheckedChange={v => setFormParams(p => ({
                  ...p,
                  pontos_facultativos: v
                    ? [...p.pontos_facultativos, pf.value]
                    : p.pontos_facultativos.filter(x => x !== pf.value),
                }))}
              />
              <Label className="text-xs">{pf.label}</Label>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground mt-1">Abrangência: Nacional</div>
        </CardContent>
      </Card>
      <ExcecoesSabado caseId={caseId!} globalSabadoDiaUtil={formParams.sabado_dia_util} />
    </div>
  );

  // =====================================================
  // FALTAS — via hook mutations
  // =====================================================
  const renderFaltas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Faltas</h2>
        <Button size="sm" onClick={() => {
          calc.addFalta.mutate({
            case_id: caseId!,
            data_inicial: new Date().toISOString().slice(0, 10),
            data_final: new Date().toISOString().slice(0, 10),
            justificada: false,
          });
        }}><Plus className="h-4 w-4 mr-1" /> Nova Falta</Button>
      </div>
      <p className="text-xs text-muted-foreground">Informe todas as faltas durante o contrato.</p>
      {calc.faltas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma falta registrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {calc.faltas.map((f: PjecalcFaltaRow) => (
            <Card key={f.id}><CardContent className="p-3 flex items-center gap-3">
              <Input type="date" defaultValue={f.data_inicial ?? ''} className="h-8 text-xs w-36" onBlur={e => calc.updateFalta.mutate({ id: f.id, updates: { data_inicial: e.target.value } })} />
              <span className="text-xs text-muted-foreground">a</span>
              <Input type="date" defaultValue={f.data_final ?? ''} className="h-8 text-xs w-36" onBlur={e => calc.updateFalta.mutate({ id: f.id, updates: { data_final: e.target.value } })} />
              <div className="flex items-center gap-1"><Checkbox defaultChecked={f.justificada} onCheckedChange={v => calc.updateFalta.mutate({ id: f.id, updates: { justificada: !!v } })} /><Label className="text-xs">Justificada</Label></div>
              <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => calc.removeFalta.mutate(f.id)}><Trash2 className="h-3 w-3" /></Button>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );

  // =====================================================
  // FÉRIAS — via hook mutations
  // =====================================================
  const renderFerias = () => {
    const addGozoPeriodo = (feriaId: string, currentPeriodos: Array<{ inicio: string; fim: string; dias: number }>) => {
      if (currentPeriodos.length >= 3) { toast.error("Máximo de 3 períodos (CLT Art. 134 §1º)"); return; }
      const updated = [...currentPeriodos, { inicio: '', fim: '', dias: 0 }];
      calc.updateFerias.mutate({ id: feriaId, updates: { periodos_gozo: updated } });
    };

    const updateGozoPeriodo = (feriaId: string, periodos: Array<{ inicio: string; fim: string; dias: number }>, idx: number, field: string, value: string) => {
      const updated = [...periodos];
      updated[idx] = { ...updated[idx], [field]: value };
      if (updated[idx].inicio && updated[idx].fim) {
        const d1 = new Date(updated[idx].inicio), d2 = new Date(updated[idx].fim);
        updated[idx].dias = Math.max(0, Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1);
      }
      calc.updateFerias.mutate({ id: feriaId, updates: { periodos_gozo: updated } });
    };

    const removeGozoPeriodo = (feriaId: string, periodos: Array<{ inicio: string; fim: string; dias: number }>, idx: number) => {
      const updated = periodos.filter((_, i) => i !== idx);
      calc.updateFerias.mutate({ id: feriaId, updates: { periodos_gozo: updated } });
    };

    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Férias</h2>
        <Button size="sm" variant="outline" onClick={() => {
          calc.generateFeriasAuto.mutate({
            dataAdmissao: formParams.data_admissao,
            dataDemissao: formParams.data_demissao,
            regimeTrabalho: formParams.regime_trabalho,
          });
        }} disabled={calc.generateFeriasAuto.isPending}>
          {calc.generateFeriasAuto.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
          Gerar Automaticamente
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">CLT Art. 134 §1º (Reforma Trabalhista): Férias podem ser fracionadas em até 3 períodos, sendo um deles ≥ 14 dias e os demais ≥ 5 dias.</p>
      {calc.ferias.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Clique em "Gerar Automaticamente".</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {calc.ferias.map((f: PjecalcFeriasRow) => {
            const periodos = (f as unknown as { periodos_gozo?: Array<{ inicio: string; fim: string; dias: number }> }).periodos_gozo || [];
            const totalDiasGozo = periodos.reduce((s, p) => s + (p.dias || 0), 0);
            const isExpanded = expandedFeriasId === f.id;
            return (
              <Card key={f.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-[10px] font-mono text-muted-foreground">{f.periodo_aquisitivo_inicio} a {f.periodo_aquisitivo_fim}</div>
                    <Input type="number" defaultValue={(f as unknown as { prazo_dias?: number }).prazo_dias ?? 30} className="h-7 text-xs w-16 text-center" onBlur={e => calc.updateFerias.mutate({ id: f.id, updates: { prazo_dias: parseInt(e.target.value) || 30 } })} />
                    <Select defaultValue={f.situacao} onValueChange={v => calc.updateFerias.mutate({ id: f.id, updates: { situacao: v } })}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gozadas">Gozadas</SelectItem>
                        <SelectItem value="indenizadas">Indenizadas</SelectItem>
                        <SelectItem value="perdidas">Perdidas</SelectItem>
                        <SelectItem value="gozadas_parcialmente">Goz. Parcial</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1"><Checkbox defaultChecked={(f as unknown as { dobra_geral?: boolean }).dobra_geral ?? false} onCheckedChange={v => calc.updateFerias.mutate({ id: f.id, updates: { dobra_geral: !!v } })} /><Label className="text-[10px]">Dobra</Label></div>
                    <div className="flex items-center gap-1"><Checkbox defaultChecked={f.abono} onCheckedChange={v => calc.updateFerias.mutate({ id: f.id, updates: { abono: !!v } })} /><Label className="text-[10px]">Abono</Label></div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] ml-auto" onClick={() => setExpandedFeriasId(isExpanded ? null : f.id)}>
                      {periodos.length > 0 ? `${periodos.length} período(s)` : 'Fracionar'} <ChevronRight className={cn("h-3 w-3 ml-1 transition-transform", isExpanded && "rotate-90")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => calc.removeFerias.mutate(f.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">Períodos de Gozo (Art. 134 §1º CLT)</span>
                        <div className="flex items-center gap-2">
                          {totalDiasGozo > 0 && <Badge variant="outline" className="text-[9px]">{totalDiasGozo}/{f.dias}d</Badge>}
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => addGozoPeriodo(f.id, periodos)} disabled={periodos.length >= 3}>
                            <Plus className="h-3 w-3 mr-1" /> Período
                          </Button>
                        </div>
                      </div>
                      {periodos.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] w-5 justify-center">{idx + 1}</Badge>
                          <Input type="date" value={p.inicio || ''} onChange={e => updateGozoPeriodo(f.id, periodos, idx, 'inicio', e.target.value)} className="h-7 text-xs w-32" />
                          <span className="text-[10px] text-muted-foreground">a</span>
                          <Input type="date" value={p.fim || ''} onChange={e => updateGozoPeriodo(f.id, periodos, idx, 'fim', e.target.value)} className="h-7 text-xs w-32" />
                          <Badge variant={p.dias >= 14 || (idx > 0 && p.dias >= 5) ? 'default' : 'destructive'} className="text-[9px]">{p.dias || 0}d</Badge>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeGozoPeriodo(f.id, periodos, idx)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      {periodos.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhum período cadastrado. Gozo integral presumido.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    );
  };

  // =====================================================
  // HISTÓRICO SALARIAL — via hook mutations
  // =====================================================
  const renderHistorico = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Histórico Salarial</h2>
        <div className="flex gap-2">
          <ImportadorFichaFinanceira caseId={caseId!} onImported={() => calc.invalidate()} />
          <Button size="sm" onClick={() => {
            if (!formParams.data_admissao) { toast.error("Preencha a data de admissão."); return; }
            calc.addHistorico.mutate({
              case_id: caseId!,
              nome: `Salário Base ${calc.historicos.length + 1}`,
              periodo_inicio: formParams.data_admissao,
              periodo_fim: formParams.data_demissao || new Date().toISOString().slice(0, 10),
              tipo_valor: 'informado',
              incidencia_fgts: true,
              incidencia_cs: true,
            });
          }}><Plus className="h-4 w-4 mr-1" /> Nova Base</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Cadastre as bases de cálculo.</p>
      {calc.historicos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma base cadastrada.</CardContent></Card>
      ) : calc.historicos.map((h) => (
        <Card key={h.id}>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">{h.nome}</CardTitle><div className="flex gap-2"><Badge variant="secondary" className="text-[10px]">{h.tipo_valor}</Badge>{h.incidencia_fgts && <Badge variant="outline" className="text-[10px]">FGTS</Badge>}{h.incidencia_cs && <Badge variant="outline" className="text-[10px]">CS</Badge>}<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => calc.removeHistorico.mutate(h.id)}><Trash2 className="h-3 w-3" /></Button></div></div></CardHeader>
          <CardContent><div className="grid grid-cols-4 gap-2 text-xs"><div><Label className="text-[10px]">Início</Label><div className="font-mono">{h.periodo_inicio}</div></div><div><Label className="text-[10px]">Fim</Label><div className="font-mono">{h.periodo_fim}</div></div><div><Label className="text-[10px]">Valor</Label><div className="font-mono">{h.valor_informado ? `R$ ${h.valor_informado.toFixed(2)}` : '—'}</div></div><div><Label className="text-[10px]">Tipo</Label><div>{h.tipo_valor}</div></div></div></CardContent>
        </Card>
      ))}
    </div>
  );

  // =====================================================
  // VERBAS — via hook mutations
  // =====================================================
  const renderVerbas = () => {
    const filteredVerbas = calc.verbas.filter((v) => {
      if (verbaFilterTipo !== 'all' && v.tipo !== verbaFilterTipo) return false;
      if (verbaFilterCarac !== 'all' && v.caracteristica !== verbaFilterCarac) return false;
      if (!verbaSearch) return true;
      const s = verbaSearch.toLowerCase();
      return v.nome?.toLowerCase().includes(s) || v.tipo?.toLowerCase().includes(s) || v.caracteristica?.toLowerCase().includes(s);
    });

    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verbas</h2>
        <div className="flex gap-2">
          <CatalogoVerbas
            caseId={caseId!}
            periodoInicio={formParams.data_admissao}
            periodoFim={formParams.data_demissao || new Date().toISOString().slice(0,10)}
            ordemBase={calc.verbas.length}
            onInsert={() => calc.invalidate()}
          />
          <Button size="sm" variant="outline" onClick={() => {
            const periodo = formParams.data_admissao && formParams.data_demissao
              ? { inicio: formParams.data_admissao, fim: formParams.data_demissao }
              : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
            calc.addVerbasBatch.mutate([
              { case_id: caseId!, nome: 'Horas Extras 50%', caracteristica: 'COMUM', ocorrencia_pagamento: 'MENSAL', tipo: 'principal', multiplicador: 1.5, divisor_informado: formParams.carga_horaria_padrao, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: calc.verbas.length },
              { case_id: caseId!, nome: 'RSR s/ Horas Extras', caracteristica: 'COMUM', ocorrencia_pagamento: 'MENSAL', tipo: 'reflexa', multiplicador: 1, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: calc.verbas.length + 1 },
              { case_id: caseId!, nome: '13º Salário', caracteristica: '13_SALARIO', ocorrencia_pagamento: 'DEZEMBRO', tipo: 'reflexa', multiplicador: 1, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: calc.verbas.length + 2 },
              { case_id: caseId!, nome: 'Férias + 1/3', caracteristica: 'FERIAS', ocorrencia_pagamento: 'PERIODO_AQUISITIVO', tipo: 'reflexa', multiplicador: 1.3333, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: calc.verbas.length + 3 },
            ]);
          }}><Briefcase className="h-4 w-4 mr-1" /> Expresso</Button>
          <Button size="sm" onClick={() => {
            const periodo = formParams.data_admissao && formParams.data_demissao
              ? { inicio: formParams.data_admissao, fim: formParams.data_demissao }
              : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
            calc.addVerba.mutate({
              case_id: caseId!,
              nome: `Verba ${calc.verbas.length + 1}`,
              tipo: 'principal',
              periodo_inicio: periodo.inicio,
              periodo_fim: periodo.fim,
              ordem: calc.verbas.length,
            });
          }}><Plus className="h-4 w-4 mr-1" /> Manual</Button>
        </div>
      </div>

      {calc.verbas.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar verba..." value={verbaSearch} onChange={e => setVerbaSearch(e.target.value)} className="pl-8 h-7 text-xs" />
          </div>
          <Select value={verbaFilterTipo} onValueChange={(v: 'all' | 'principal' | 'reflexa') => setVerbaFilterTipo(v)}>
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
              <SelectItem value="reflexa">Reflexa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verbaFilterCarac} onValueChange={v => setVerbaFilterCarac(v)}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas caract.</SelectItem>
              <SelectItem value="comum">Comum</SelectItem>
              <SelectItem value="13_salario">13º Salário</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
              <SelectItem value="aviso_previo">Aviso Prévio</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px]">{filteredVerbas.length}/{calc.verbas.length}</Badge>
        </div>
      )}

      {calc.verbas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Use "Catálogo", "Expresso" ou "Manual".</CardContent></Card>
      ) : filteredVerbas.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma verba encontrada para "{verbaSearch}".</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredVerbas.map((v: PjecalcVerbaRow) => (
            <div key={v.id}>
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={v.tipo === 'principal' ? 'default' : 'secondary'} className="text-[10px]">{v.tipo === 'principal' ? 'P' : 'R'}</Badge>
                      <div>
                        <div className="text-sm font-medium">{v.nome}</div>
                        <div className="text-[10px] text-muted-foreground flex gap-2"><span>{v.caracteristica}</span><span>•</span><span>{v.ocorrencia_pagamento}</span><span>•</span><span>×{v.multiplicador} ÷{v.divisor_informado || 30}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{v.periodo_inicio?.slice(0, 7)} → {v.periodo_fim?.slice(0, 7)}</Badge>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => setPreviewVerbaId(previewVerbaId === v.id ? null : v.id)}>
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => setSelectedVerbaForGrid(v)}>
                        <BarChart3 className="h-3 w-3 mr-1" /> Grade
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => calc.removeVerba.mutate({ id: v.id, nome: v.nome })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {previewVerbaId === v.id && (
                <div className="mt-1">
                  <VerbaPreview verba={v as any} engine={null} onClose={() => setPreviewVerbaId(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================
  if (calc.isLoading || !calc.caseData) {
    return (
      <MainLayoutPremium title="PJe-Calc">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayoutPremium>
    );
  }

  return (
    <MainLayoutPremium
      title="PJe-Calc"
      breadcrumbs={[
        { label: "Casos", href: "/casos" },
        { label: calc.caseData.cliente, href: `/casos/${caseId}` },
        { label: "PJe-Calc" },
      ]}
    >
      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* Sidebar de módulos */}
        <div className="w-56 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/casos/${caseId}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <PerfilAcesso currentPerfil={perfilAcesso} onChangePerfil={setPerfilAcesso} />
          </div>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-0.5 pr-3">
              {MODULOS.map((mod, idx) => {
                const isActive = activeModule === mod.id;
                const status = calc.completude[mod.id] as ModuleStatus | undefined;
                const statusCfg = status ? STATUS_CONFIG[status] : STATUS_CONFIG.nao_iniciado;
                const StatusIcon = statusCfg.icon;

                return (
                  <div key={mod.id}>
                    {idx === 29 && <Separator className="my-3" />}
                    <button
                      onClick={() => setActiveModule(mod.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all text-xs",
                        isActive && "bg-primary text-primary-foreground shadow-sm",
                        !isActive && statusCfg.bg,
                        !isActive && !statusCfg.bg && "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {StatusIcon && !isActive ? (
                        <StatusIcon className={`h-3.5 w-3.5 ${statusCfg.color}`} />
                      ) : (
                        <mod.icon className="h-3.5 w-3.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{mod.label}</div>
                        <div className={cn("text-[10px] truncate", isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{mod.desc}</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Conteúdo do módulo */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="pr-4 pb-8">
              {renderModule()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </MainLayoutPremium>
  );
}
