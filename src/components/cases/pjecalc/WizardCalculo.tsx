/**
 * Wizard de Cálculo — Fluxo guiado passo a passo
 * Passos:
 * 1. Processo e Partes
 * 2. CTPS (eventos: férias + afastamentos)
 * 3. Cartão de Ponto (apuração diária)
 * 4. Remuneração (histórico mensal + rubricas raw + mapeamento)
 * 5. Pedidos e Parâmetros
 * 6. Pré-cálculo review + checklist
 * 7. Calcular → relatórios → export PJC/PDF
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as svc from "@/lib/pjecalc/service";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Check, AlertTriangle,
  Briefcase, Calendar, Clock, DollarSign, FileText,
  ClipboardCheck, Calculator, Upload, Loader2,
  CheckCircle2, XCircle, Info, Sparkles
} from "lucide-react";

// Import existing modules
import { ModuloDadosProcesso } from "./ModuloDadosProcesso";
import { ModuloCartaoPontoDiario } from "./ModuloCartaoPontoDiario";
import { ImportadorFichaFinanceira } from "./ImportadorFichaFinanceira";
import { ExtractionReviewPanel } from "./ExtractionReviewPanel";
import { ValidationPanel } from "./ValidationPanel";
import { CTPSUploader } from "./CTPSUploader";
import { DocumentPipelineStatus } from "./DocumentPipelineStatus";
import { GeradorReflexos } from "./GeradorReflexos";
import { MRDStatePanel } from "./MRDStatePanel";
import { LiquidationPipelineDialog } from "./LiquidationPipelineDialog";
import { calcularCompletude, type ModuleStatus } from "@/lib/pjecalc/completude";
import { useIntelligentLiquidation } from "@/hooks/useIntelligentLiquidation";
import type { ValidationInput } from "@/lib/pjecalc/validation-engine";

interface WizardProps {
  caseId: string;
  onComplete?: () => void;
  onExit?: () => void;
}

interface WizardStep {
  id: string;
  label: string;
  icon: any;
  desc: string;
  requiredFields?: string[];
  blocking?: boolean; // if true, must complete before proceeding
}

const STEPS: WizardStep[] = [
  { id: 'processo', label: 'Processo e Partes', icon: Briefcase, desc: 'Identificação processual, reclamante e reclamada', blocking: true },
  { id: 'ctps', label: 'CTPS — Eventos', icon: Calendar, desc: 'Férias, faltas e afastamentos extraídos da CTPS' },
  { id: 'ponto', label: 'Cartão de Ponto', icon: Clock, desc: 'Apuração diária da jornada de trabalho' },
  { id: 'remuneracao', label: 'Remuneração', icon: DollarSign, desc: 'Histórico salarial, fichas financeiras e contracheques' },
  { id: 'pedidos', label: 'Pedidos e Parâmetros', icon: FileText, desc: 'Verbas, reflexos e configuração do cálculo' },
  { id: 'revisao', label: 'Pré-Cálculo Review', icon: ClipboardCheck, desc: 'Conferência final antes de calcular' },
  { id: 'calcular', label: 'Calcular e Exportar', icon: Calculator, desc: 'Executar liquidação e gerar relatórios' },
];

const STATUS_ICON: Record<string, { icon: any; color: string }> = {
  completo: { icon: CheckCircle2, color: 'text-[hsl(var(--success))]' },
  incompleto: { icon: XCircle, color: 'text-destructive' },
  alerta: { icon: AlertTriangle, color: 'text-[hsl(var(--warning))]' },
  pendente: { icon: Info, color: 'text-muted-foreground' },
};

export function WizardCalculo({ caseId, onComplete, onExit }: WizardProps) {
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const liquidation = useIntelligentLiquidation(caseId);

  // Load data for completude check
  const { data: params } = useQuery({
    queryKey: ["pjecalc_parametros", caseId],
    queryFn: () => svc.getParametros(caseId),
  });

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas", caseId],
    queryFn: () => svc.getFaltas(caseId),
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ["pjecalc_ferias", caseId],
    queryFn: () => svc.getFerias(caseId),
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: () => svc.getHistoricoSalarial(caseId),
  });

  const { data: verbas = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: () => svc.getVerbas(caseId),
  });

  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao", caseId],
    queryFn: () => svc.getResultado(caseId),
  });

  // Calculate step status
  const stepStatus = useMemo(() => {
    const completude = calcularCompletude({ params, faltas, ferias, historicos, verbas, resultado });
    const status: Record<string, string> = {};

    // Step 0: Processo
    status.processo = completude.dados_processo === 'validado' || completude.parametros === 'validado' ? 'completo' :
      (params?.data_admissao ? 'alerta' : 'pendente');

    // Step 1: CTPS
    status.ctps = (faltas.length > 0 || ferias.length > 0) ? 'completo' : 'pendente';

    // Step 2: Ponto
    status.ponto = completude.cartao_ponto === 'preenchido' ? 'completo' :
      completude.cartao_ponto === 'alerta' ? 'alerta' : 'pendente';

    // Step 3: Remuneração
    status.remuneracao = completude.historico === 'validado' ? 'completo' :
      completude.historico === 'incompleto' ? 'incompleto' :
        historicos.length > 0 ? 'alerta' : 'pendente';

    // Step 4: Pedidos
    status.pedidos = verbas.length > 0 ? 'completo' : 'pendente';

    // Step 5: Revisão
    const hasCritical = Object.values(completude).some(v => v === 'incompleto');
    status.revisao = hasCritical ? 'incompleto' : (verbas.length > 0 ? 'completo' : 'pendente');

    // Step 6: Calcular
    status.calcular = resultado ? 'completo' : 'pendente';

    return status;
  }, [params, faltas, ferias, historicos, verbas, resultado]);

  const completedSteps = Object.values(stepStatus).filter(s => s === 'completo').length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);

  const step = STEPS[currentStep];

  const renderStepContent = () => {
    switch (step.id) {
      case 'processo':
        return <ModuloDadosProcesso caseId={caseId} />;
      case 'ctps':
        return (
          <div className="space-y-4">
            <CTPSUploader caseId={caseId} onExtracted={() => {
              qc.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] });
              qc.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] });
            }} />
            
            <DocumentPipelineStatus caseId={caseId} />

            {(ferias.length > 0 || faltas.length > 0) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Eventos Registrados</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline">{ferias.length} férias</Badge>
                    <Badge variant="outline">{faltas.length} faltas/afastamentos</Badge>
                  </div>
                  {ferias.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                      <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" />
                      <span>{f.periodo_aquisitivo_inicio} → {f.periodo_aquisitivo_fim}</span>
                      <Badge variant="secondary" className="text-[9px]">{f.situacao || 'GOZADAS'}</Badge>
                    </div>
                  ))}
                  {faltas.map((f: any, i: number) => (
                    <div key={`f${i}`} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>{f.data_inicial} → {f.data_final}</span>
                      <Badge variant="outline" className="text-[9px]">{f.tipo_falta || f.motivo || 'FALTA'}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'ponto':
        return (
          <ModuloCartaoPontoDiario
            caseId={caseId}
            dataAdmissao={params?.data_admissao || ''}
            dataDemissao={params?.data_demissao || ''}
            cargaHoraria={params?.carga_horaria_padrao || 220}
          />
        );
      case 'remuneracao':
        return (
          <div className="space-y-4">
            <ImportadorFichaFinanceira caseId={caseId} />
            <ExtractionReviewPanel caseId={caseId} />
          </div>
        );
      case 'pedidos':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Pedidos e Parâmetros</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Configure verbas base e gere reflexos automaticamente.
                  Para configuração avançada, use o módulo "Verbas" na sidebar.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">{verbas.filter((v: any) => !v.verba_principal_id).length} verbas principais</Badge>
                  <Badge variant="outline">{verbas.filter((v: any) => v.verba_principal_id).length} reflexos</Badge>
                </div>
                {verbas.length === 0 && (
                  <div className="mt-4 p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Nenhuma verba configurada. Use o módulo "Verbas" na sidebar ou o Catálogo de Verbas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <GeradorReflexos caseId={caseId} />
          </div>
        );
      case 'revisao': {
        const valInput: ValidationInput = {
          admissao: params?.data_admissao,
          demissao: params?.data_demissao,
          ajuizamento: params?.data_ajuizamento,
          inicio_calculo: params?.data_inicial,
          fim_calculo: params?.data_final,
        };
        return (
          <div className="space-y-4">
            {renderRevisao()}
            <ValidationPanel input={valInput} />
          </div>
        );
      }
      case 'calcular':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Calcular e Exportar</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Execute a liquidação completa e gere os relatórios para conferência.
                </p>
                {resultado ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))]">
                      <CheckCircle2 className="h-4 w-4" />
                      Liquidação calculada com sucesso
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use o módulo "Resumo" na sidebar para ver os resultados detalhados.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Use o botão "Calcular" no módulo Resumo da sidebar principal para executar a liquidação.
                  </p>
                )}
              </CardContent>
            </Card>
            <MRDStatePanel caseId={caseId} />
          </div>
        );
      default:
        return null;
    }
  };

  const renderRevisao = () => {
    const completude = calcularCompletude({ params, faltas, ferias, historicos, verbas, resultado });
    const items = [
      { label: 'Dados do Processo', status: stepStatus.processo, detail: params?.data_admissao ? `Admissão: ${params.data_admissao}` : 'Não preenchido' },
      { label: 'CTPS (Férias/Faltas)', status: stepStatus.ctps, detail: `${ferias.length} férias, ${faltas.length} faltas` },
      { label: 'Cartão de Ponto', status: stepStatus.ponto, detail: completude.cartao_ponto === 'preenchido' ? 'Configurado' : 'Não configurado' },
      { label: 'Remuneração', status: stepStatus.remuneracao, detail: `${historicos.length} rubricas no histórico` },
      { label: 'Verbas/Pedidos', status: stepStatus.pedidos, detail: `${verbas.length} verbas configuradas` },
    ];

    const hasCritical = items.some(i => i.status === 'incompleto');

    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Checklist Pré-Cálculo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, i) => {
            const si = STATUS_ICON[item.status] || STATUS_ICON.pendente;
            const Icon = si.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded border border-border/50">
                <Icon className={`h-4 w-4 ${si.color}`} />
                <div className="flex-1">
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">{item.detail}</div>
                </div>
                <Badge variant={item.status === 'completo' ? 'default' : 'outline'} className="text-[9px]">
                  {item.status === 'completo' ? 'OK' : item.status === 'incompleto' ? 'PENDENTE' : item.status === 'alerta' ? 'ALERTA' : 'PENDENTE'}
                </Badge>
              </div>
            );
          })}
          {hasCritical && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Existem pendências críticas. Revise os itens marcados antes de calcular.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Wizard de Cálculo</span>
          <span className="text-muted-foreground">{progress}% completo</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isActive = i === currentStep;
          const status = stepStatus[s.id] || 'pendente';
          const si = STATUS_ICON[status] || STATUS_ICON.pendente;
          const StepIcon = si.icon;

          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted text-muted-foreground'
              }`}
            >
              <StepIcon className={`h-3.5 w-3.5 ${isActive ? '' : si.color}`} />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Current step header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <step.icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{step.label}</h2>
          <p className="text-xs text-muted-foreground">{step.desc}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit}>
              Sair do Wizard
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentStep(prev => prev + 1)}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={onComplete}>
              <Check className="h-4 w-4 mr-1" />
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
