/**
 * =====================================================
 * PAINEL DO AGENTE DE AUDITORIA COM IA
 * =====================================================
 * UI principal para o módulo de auditoria inteligente
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuditAgent } from '@/hooks/useAuditAgent';
import {
  AUDIT_STATUS_CONFIG, SEVERITY_CONFIG,
  type AuditFinding, type ConfidenceScore, type AuditOverallStatus,
} from '@/lib/pjecalc/audit/types';
import {
  Brain, Play, Loader2, ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, CheckCircle2, XCircle, Info, ChevronDown,
  Clock, Zap, FileSearch, GitCompareArrows, BarChart3,
  Eye, RefreshCcw, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditAgentPanelProps {
  caseId: string;
  calculoId?: string | null;
}

// =====================================================
// STATUS ICON
// =====================================================
function StatusIcon({ status }: { status: AuditOverallStatus | null }) {
  switch (status) {
    case 'APTO': return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
    case 'APTO_COM_WARNINGS': return <ShieldAlert className="h-5 w-5 text-amber-500" />;
    case 'BAIXA_CONFIABILIDADE': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'BLOQUEADO': return <ShieldX className="h-5 w-5 text-red-500" />;
    case 'DIVERGENTE_DO_PJE': return <GitCompareArrows className="h-5 w-5 text-purple-500" />;
    default: return <Brain className="h-5 w-5 text-muted-foreground" />;
  }
}

// =====================================================
// FINDING CARD
// =====================================================
function FindingCard({ finding, onResolve }: { finding: AuditFinding; onResolve: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('rounded-lg border p-3', finding.resolved && 'opacity-50', sev.color)}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {finding.severity === 'critical' ? <XCircle className="h-4 w-4" /> :
               finding.severity === 'high' ? <AlertTriangle className="h-4 w-4" /> :
               finding.severity === 'medium' ? <AlertTriangle className="h-4 w-4" /> :
               <Info className="h-4 w-4" />}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold">{finding.code}</span>
                <Badge variant="outline" className="text-[10px] h-4">{sev.label}</Badge>
                <Badge variant="secondary" className="text-[10px] h-4">{finding.module}</Badge>
                {finding.requires_human_confirmation && (
                  <Badge variant="destructive" className="text-[10px] h-4">Requer Confirmação</Badge>
                )}
                {finding.resolved && (
                  <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700">Resolvido</Badge>
                )}
              </div>
              <p className="text-sm font-medium mt-1">{finding.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{finding.user_message}</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 pt-3 border-t space-y-2">
          <div>
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Mensagem Técnica</span>
            <p className="text-xs font-mono mt-0.5">{finding.technical_message}</p>
          </div>
          {finding.recommended_action && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Ação Recomendada</span>
              <p className="text-xs mt-0.5">{finding.recommended_action}</p>
            </div>
          )}
          {finding.source_basis && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Base</span>
              <p className="text-xs mt-0.5">{finding.source_basis}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-muted-foreground">Confiança: {Math.round(finding.confidence * 100)}%</span>
            <span className="text-[10px] text-muted-foreground">Agente: {finding.agent_name}</span>
            {!finding.resolved && (
              <Button size="sm" variant="outline" className="ml-auto h-6 text-[10px]" onClick={() => onResolve(finding.id)}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =====================================================
// CONFIDENCE MODULE CARD
// =====================================================
function ConfidenceModuleCard({ score }: { score: ConfidenceScore }) {
  const color = score.score >= 80 ? 'text-emerald-600' : score.score >= 50 ? 'text-amber-600' : 'text-red-600';
  const bgColor = score.score >= 80 ? 'bg-emerald-500' : score.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{score.label}</span>
        <span className={cn('text-lg font-bold tabular-nums', color)}>{score.score}%</span>
      </div>
      <Progress value={score.score} className="h-1.5" />
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>Campos: {score.field_count}</span>
        <span>Resolvidos: {score.resolved_count}</span>
        {score.inferred_count > 0 && <span className="text-amber-600">Inferidos: {score.inferred_count}</span>}
        {score.absent_count > 0 && <span className="text-red-600">Ausentes: {score.absent_count}</span>}
        {score.blocker_count > 0 && <span className="text-red-700 font-semibold">Bloqueios: {score.blocker_count}</span>}
      </div>
    </div>
  );
}

// =====================================================
// MAIN PANEL
// =====================================================
export function AuditAgentPanel({ caseId, calculoId }: AuditAgentPanelProps) {
  const {
    latestRun, isLoadingLatest, isRunning,
    runPreCalculo, runPosCalculo, runReconciliacao, runFull,
    resolveFinding, history,
  } = useAuditAgent(caseId, calculoId);

  const [activeTab, setActiveTab] = useState('overview');

  const findings = latestRun?.findings || [];
  const scores = latestRun?.scores || [];
  const blockers = findings.filter(f => f.severity === 'critical' && !f.resolved);
  const warnings = findings.filter(f => (f.severity === 'high' || f.severity === 'medium') && !f.resolved);
  const infos = findings.filter(f => (f.severity === 'low' || f.severity === 'info') && !f.resolved);

  const handleResolve = (findingId: string) => {
    resolveFinding({ findingId, note: 'Resolvido pelo operador' });
  };

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-primary" />
              Agente de Auditoria com IA
            </CardTitle>
            <div className="flex items-center gap-2">
              {latestRun?.overall_status && (
                <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                  AUDIT_STATUS_CONFIG[latestRun.overall_status as AuditOverallStatus]?.color)}>
                  <StatusIcon status={latestRun.overall_status as AuditOverallStatus} />
                  {AUDIT_STATUS_CONFIG[latestRun.overall_status as AuditOverallStatus]?.label || latestRun.overall_status}
                </div>
              )}
              {latestRun && (
                <Badge variant="outline" className="text-[10px]">
                  Confiança: {latestRun.overall_confidence}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runPreCalculo} disabled={isRunning} className="gap-1.5">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
              Auditar Insumos
            </Button>
            <Button size="sm" variant="secondary" onClick={runPosCalculo} disabled={isRunning} className="gap-1.5">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Auditar Resultado
            </Button>
            <Button size="sm" variant="secondary" onClick={() => runReconciliacao()} disabled={isRunning} className="gap-1.5">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
              Reconciliar vs PJe
            </Button>
            <Button size="sm" variant="outline" onClick={runFull} disabled={isRunning} className="gap-1.5">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Auditoria Completa
            </Button>
          </div>

          {/* Quick stats */}
          {latestRun && (
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {latestRun.execution_time_ms ? `${(latestRun.execution_time_ms / 1000).toFixed(1)}s` : '–'}
              </span>
              <span>
                {latestRun.created_at && formatDistanceToNow(new Date(latestRun.created_at), { addSuffix: true, locale: ptBR })}
              </span>
              <span>{findings.length} findings</span>
              {blockers.length > 0 && (
                <span className="text-red-600 font-semibold">{blockers.length} bloqueio(s)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content tabs */}
      {latestRun && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" /> Findings
              {(blockers.length + warnings.length) > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[9px] ml-1">{blockers.length + warnings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="confidence" className="text-xs gap-1">
              <ShieldCheck className="h-3 w-3" /> Confiabilidade
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1">
              <History className="h-3 w-3" /> Histórico
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            {/* Overall confidence gauge */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0 relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={latestRun.overall_confidence >= 80 ? '#10b981' : latestRun.overall_confidence >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8" strokeDasharray={`${latestRun.overall_confidence * 2.64} 264`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold tabular-nums">{latestRun.overall_confidence}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">Score Geral de Confiabilidade</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg border p-2">
                        <div className="text-lg font-bold text-red-600">{blockers.length}</div>
                        <div className="text-[10px] text-muted-foreground">Bloqueios</div>
                      </div>
                      <div className="rounded-lg border p-2">
                        <div className="text-lg font-bold text-amber-600">{warnings.length}</div>
                        <div className="text-[10px] text-muted-foreground">Alertas</div>
                      </div>
                      <div className="rounded-lg border p-2">
                        <div className="text-lg font-bold text-blue-600">{infos.length}</div>
                        <div className="text-[10px] text-muted-foreground">Informações</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Module scores summary */}
            {scores.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {scores.map(s => <ConfidenceModuleCard key={s.id} score={s} />)}
              </div>
            )}

            {/* Top blockers */}
            {blockers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" /> Bloqueios Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {blockers.slice(0, 5).map(f => (
                    <FindingCard key={f.id} finding={f} onResolve={handleResolve} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FINDINGS */}
          <TabsContent value="findings">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 pr-3">
                {findings.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhum finding registrado nesta auditoria.
                  </div>
                )}
                {blockers.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold text-red-600 uppercase mt-2">Bloqueios ({blockers.length})</h4>
                    {blockers.map(f => <FindingCard key={f.id} finding={f} onResolve={handleResolve} />)}
                  </>
                )}
                {warnings.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold text-amber-600 uppercase mt-4">Alertas ({warnings.length})</h4>
                    {warnings.map(f => <FindingCard key={f.id} finding={f} onResolve={handleResolve} />)}
                  </>
                )}
                {infos.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold text-blue-600 uppercase mt-4">Informações ({infos.length})</h4>
                    {infos.map(f => <FindingCard key={f.id} finding={f} onResolve={handleResolve} />)}
                  </>
                )}
                {/* Resolved findings */}
                {findings.filter(f => f.resolved).length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                      Resolvidos ({findings.filter(f => f.resolved).length})
                    </h4>
                    {findings.filter(f => f.resolved).map(f => (
                      <FindingCard key={f.id} finding={f} onResolve={handleResolve} />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CONFIDENCE */}
          <TabsContent value="confidence">
            <div className="space-y-3">
              {scores.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Scores de confiabilidade não disponíveis. Execute a auditoria.
                </div>
              ) : (
                scores.map(s => <ConfidenceModuleCard key={s.id} score={s} />)
              )}
            </div>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-3">
                {history.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma auditoria executada ainda.
                  </div>
                )}
                {history.map(run => (
                  <Card key={run.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <StatusIcon status={run.overall_status as AuditOverallStatus} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{run.run_type}</Badge>
                          {run.overall_status && (
                            <span className="text-xs font-semibold">
                              {AUDIT_STATUS_CONFIG[run.overall_status as AuditOverallStatus]?.label || run.overall_status}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {run.created_at && formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: ptBR })}
                          {run.execution_time_ms && ` • ${(run.execution_time_ms / 1000).toFixed(1)}s`}
                          {` • Confiança: ${run.overall_confidence}%`}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!latestRun && !isLoadingLatest && !isRunning && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <h3 className="font-semibold">Agente de Auditoria</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Execute uma auditoria com IA para analisar os insumos do caso, detectar inconsistências,
              verificar completude e gerar um score de confiabilidade antes de calcular.
            </p>
            <Button onClick={runPreCalculo} className="gap-1.5">
              <Play className="h-4 w-4" /> Iniciar Auditoria Pré-Cálculo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isRunning && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Executando auditoria com IA...</p>
            <p className="text-xs text-muted-foreground">Analisando insumos, verbas, monetária e coerência do caso</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
