// =====================================================
// CASE WORKFLOW DASHBOARD - VISÃO GERAL DO CASO
// =====================================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  CheckCircle2, 
  Calculator, 
  FileOutput,
  AlertCircle,
  Clock,
  ChevronRight,
  Users,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  count?: number;
  pendingCount?: number;
  route: string;
}

interface CaseData {
  id: string;
  cliente: string;
  numero_processo: string | null;
  tribunal: string | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

interface Party {
  id: string;
  tipo: 'reclamante' | 'reclamada';
  nome: string;
  documento: string | null;
}

interface Contract {
  id: string;
  data_admissao: string;
  data_demissao: string | null;
  funcao: string | null;
  salario_inicial: number | null;
}

export function CaseWorkflowDashboard() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch case data
  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();
      if (error) throw error;
      return data as CaseData;
    },
    enabled: !!caseId,
  });

  // Fetch parties
  const { data: parties } = useQuery({
    queryKey: ['parties', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('case_id', caseId);
      if (error) throw error;
      return data as Party[];
    },
    enabled: !!caseId,
  });

  // Fetch contract
  const { data: contract } = useQuery({
    queryKey: ['contract', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employment_contracts')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (error) throw error;
      return data as Contract | null;
    },
    enabled: !!caseId,
  });

  // Fetch documents count
  const { data: docsStats } = useQuery({
    queryKey: ['docs-stats', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, status')
        .eq('case_id', caseId);
      if (error) throw error;
      const total = data.length;
      const processed = data.filter(d => d.status === 'indexed').length;
      const pending = data.filter(d => ['uploaded', 'pending'].includes(d.status || '')).length;
      return { total, processed, pending };
    },
    enabled: !!caseId,
  });

  // Fetch validations stats
  const { data: validationStats } = useQuery({
    queryKey: ['validation-stats', caseId],
    queryFn: async () => {
      const { data: extractions } = await supabase
        .from('extractions')
        .select('id, status')
        .eq('case_id', caseId);
      
      const { data: facts } = await supabase
        .from('facts')
        .select('id, confirmado')
        .eq('case_id', caseId);
      
      const totalExtractions = extractions?.length || 0;
      const validatedExtractions = extractions?.filter(e => e.status === 'validado').length || 0;
      const totalFacts = facts?.length || 0;
      const confirmedFacts = facts?.filter(f => f.confirmado).length || 0;
      
      return { 
        total: totalExtractions + totalFacts,
        validated: validatedExtractions + confirmedFacts,
        pending: (totalExtractions - validatedExtractions) + (totalFacts - confirmedFacts),
      };
    },
    enabled: !!caseId,
  });

  // Fetch snapshots
  const { data: snapshots } = useQuery({
    queryKey: ['snapshots', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calc_snapshots')
        .select('id, versao, status, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });

  // Fetch petitions
  const { data: petitions } = useQuery({
    queryKey: ['petitions', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petitions')
        .select('id, status, created_at')
        .eq('case_id', caseId);
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });

  // Build workflow steps
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'documents',
      title: 'Documentos',
      description: 'Envio e processamento de documentos',
      icon: FileText,
      status: docsStats?.total === 0 ? 'pending' : 
              docsStats?.pending === 0 ? 'completed' : 'in_progress',
      count: docsStats?.total || 0,
      pendingCount: docsStats?.pending || 0,
      route: `/casos/${caseId}?tab=documentos`,
    },
    {
      id: 'validation',
      title: 'Conferência',
      description: 'Conferência e aprovação de dados',
      icon: CheckCircle2,
      status: validationStats?.total === 0 ? 'blocked' :
              validationStats?.pending === 0 ? 'completed' : 'in_progress',
      count: validationStats?.validated || 0,
      pendingCount: validationStats?.pending || 0,
      route: `/casos/${caseId}?tab=validacao`,
    },
    {
      id: 'calculation',
      title: 'Cálculo',
      description: 'Execução das rubricas trabalhistas',
      icon: Calculator,
      status: !snapshots?.length ? 
              (validationStats?.pending === 0 ? 'pending' : 'blocked') :
              snapshots?.some(s => s.status === 'aprovado') ? 'completed' : 'in_progress',
      count: snapshots?.length || 0,
      route: `/casos/${caseId}?tab=calculo`,
    },
    {
      id: 'petition',
      title: 'Petição',
      description: 'Geração do documento final',
      icon: FileOutput,
      status: !petitions?.length ? 
              (snapshots?.some(s => s.status === 'aprovado') ? 'pending' : 'blocked') :
              petitions?.some(p => p.status === 'final') ? 'completed' : 'in_progress',
      count: petitions?.length || 0,
      route: `/casos/${caseId}?tab=peticao`,
    },
  ];

  const completedSteps = workflowSteps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / workflowSteps.length) * 100;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const reclamante = parties?.find(p => p.tipo === 'reclamante');
  const reclamada = parties?.find(p => p.tipo === 'reclamada');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {caseData?.cliente || 'Carregando...'}
          </h1>
          {caseData?.numero_processo && (
            <p className="text-muted-foreground mt-1">
              Processo nº {caseData.numero_processo}
              {caseData.tribunal && ` • ${caseData.tribunal}`}
            </p>
          )}
        </div>
        <Badge 
          variant={caseData?.status === 'finalizado' ? 'default' : 'secondary'}
          className="text-sm"
        >
          {caseData?.status?.replace('_', ' ') || 'rascunho'}
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Progresso do Caso</CardTitle>
          <CardDescription>
            {completedSteps} de {workflowSteps.length} etapas concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {workflowSteps.map((step, index) => (
          <Card 
            key={step.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              step.status === 'blocked' && "opacity-60",
              step.status === 'completed' && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
              step.status === 'in_progress' && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
            )}
            onClick={() => step.status !== 'blocked' && navigate(step.route)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-2 rounded-lg",
                  step.status === 'completed' && "bg-green-500/10 text-green-600",
                  step.status === 'in_progress' && "bg-amber-500/10 text-amber-600",
                  step.status === 'pending' && "bg-muted text-muted-foreground",
                  step.status === 'blocked' && "bg-muted text-muted-foreground"
                )}>
                  <step.icon className="h-5 w-5" />
                </div>
                {step.status === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {step.status === 'in_progress' && step.pendingCount !== undefined && step.pendingCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {step.pendingCount} pendente{step.pendingCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {step.status === 'blocked' && (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{step.title}</h3>
                  {step.count !== undefined && step.count > 0 && (
                    <span className="text-sm text-muted-foreground">{step.count}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
              
              {step.status !== 'blocked' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 w-full justify-between"
                >
                  {step.status === 'completed' ? 'Ver detalhes' : 'Continuar'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Case Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Partes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reclamante ? (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reclamante</p>
                  <p className="font-medium">{reclamante.nome}</p>
                  {reclamante.documento && (
                    <p className="text-sm text-muted-foreground">{reclamante.documento}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Reclamante não cadastrado</p>
            )}
            
            {reclamada ? (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Briefcase className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reclamada</p>
                  <p className="font-medium">{reclamada.nome}</p>
                  {reclamada.documento && (
                    <p className="text-sm text-muted-foreground">{reclamada.documento}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Reclamada não cadastrada</p>
            )}
            
            <Button variant="outline" size="sm" className="w-full mt-2">
              Gerenciar Partes
            </Button>
          </CardContent>
        </Card>

        {/* Contract */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contrato de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contract ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Admissão</span>
                  <span className="font-medium">{formatDate(contract.data_admissao)}</span>
                </div>
                {contract.data_demissao && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Demissão</span>
                    <span className="font-medium">{formatDate(contract.data_demissao)}</span>
                  </div>
                )}
                {contract.funcao && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Função</span>
                    <span className="font-medium">{contract.funcao}</span>
                  </div>
                )}
                {contract.salario_inicial && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Salário Inicial</span>
                    <span className="font-medium">{formatCurrency(contract.salario_inicial)}</span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Editar Contrato
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum contrato cadastrado
                </p>
                <Button variant="outline" size="sm">
                  Cadastrar Contrato
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {snapshots && snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Últimos Cálculos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {snapshots.slice(0, 3).map((snapshot) => (
                <div 
                  key={snapshot.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => navigate(`/casos/${caseId}/snapshot/${snapshot.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Snapshot v{snapshot.versao}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(snapshot.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    snapshot.status === 'aprovado' ? 'default' :
                    snapshot.status === 'revisao' ? 'secondary' : 'outline'
                  }>
                    {snapshot.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
