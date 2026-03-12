/**
 * =====================================================
 * LIQUIDATION PIPELINE DIALOG — UI de progresso
 * =====================================================
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, Loader2, AlertTriangle, Info,
  Clock, FileText, Shield, Calculator, BarChart3,
  ChevronDown, ChevronRight, Ban, Eye, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { IntelligentLiquidationState } from "@/hooks/useIntelligentLiquidation";
import type { PipelineStep, PipelineStepStatus } from "@/lib/pjecalc/intelligent-liquidation";
import { AUDIT_STATUS_CONFIG } from "@/lib/pjecalc/audit/types";
import type { AuditOverallStatus } from "@/lib/pjecalc/audit/types";

// =====================================================
// STEP STATUS ICON MAPPING
// =====================================================

const STEP_ICON: Record<PipelineStepStatus, { icon: typeof CheckCircle2; className: string }> = {
  pending: { icon: Clock, className: 'text-muted-foreground' },
  running: { icon: Loader2, className: 'text-primary animate-spin' },
  completed: { icon: CheckCircle2, className: 'text-emerald-500' },
  skipped: { icon: Info, className: 'text-muted-foreground/50' },
  failed: { icon: XCircle, className: 'text-destructive' },
  blocked: { icon: Ban, className: 'text-destructive' },
};

// =====================================================
// COMPONENT
// =====================================================

interface Props {
  state: IntelligentLiquidationState;
  onClose: () => void;
}

export function LiquidationPipelineDialog({ state, onClose }: Props) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showBlockers, setShowBlockers] = useState(false);

  const { isRunning, isDialogOpen, steps, result, error, currentStepLabel, progress } = state;

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open && !isRunning) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-primary" />
            Liquidação Inteligente
            {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary ml-2" />}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">{currentStepLabel}</span>
            <span className="text-muted-foreground">{completedSteps}/{totalSteps} etapas</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Badge */}
        {result && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <StatusBadge status={result.confidenceStatus} />
            <div className="flex-1 text-xs space-y-0.5">
              <div className="font-medium">
                Score: {result.confidenceScore}%
              </div>
              <div className="text-muted-foreground">
                {result.documentsRead} docs lidos · {result.correctionsApplied} correções · {result.conflictsDetected} conflitos · {result.recalculationCount}x cálculo
              </div>
            </div>
            {result.calculationResult && (
              <div className="text-right text-xs">
                <div className="font-bold text-primary">
                  R$ {result.calculationResult.result.resumo.liquido_reclamante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted-foreground">Líquido Reclamante</div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Steps List */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-1 pr-4">
            {steps.map((step) => {
              const { icon: Icon, className } = STEP_ICON[step.status];
              const isExpanded = expandedStep === step.id;
              const hasDetails = step.details && Object.keys(step.details).length > 0;

              return (
                <div key={step.id} className="group">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                    onClick={() => hasDetails && setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${className}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{step.label}</div>
                      {step.status === 'running' && (
                        <div className="text-[10px] text-muted-foreground">{step.description}</div>
                      )}
                      {step.error && (
                        <div className="text-[10px] text-destructive truncate">{step.error}</div>
                      )}
                    </div>
                    {step.durationMs != null && (
                      <span className="text-[10px] text-muted-foreground">
                        {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                    {hasDetails && (
                      isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && step.details && (
                    <div className="ml-9 mb-2 p-2 rounded bg-muted/30 text-[10px] font-mono space-y-0.5">
                      {Object.entries(step.details).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted-foreground">{k}:</span>
                          <span className="text-foreground">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Blockers Section */}
        {result && result.blockers.length > 0 && (
          <>
            <Separator />
            <div>
              <button
                className="flex items-center gap-2 text-xs font-medium text-destructive w-full"
                onClick={() => setShowBlockers(!showBlockers)}
              >
                <Ban className="h-3.5 w-3.5" />
                {result.blockers.length} Bloqueio(s)
                {showBlockers ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
              {showBlockers && (
                <div className="mt-2 space-y-2">
                  {result.blockers.map((b, i) => (
                    <div key={i} className="p-2 rounded border border-destructive/20 bg-destructive/5 text-xs space-y-1">
                      <div className="font-medium text-destructive">[{b.code}] {b.title}</div>
                      <div className="text-muted-foreground">{b.userMessage}</div>
                      <div className="text-[10px]">
                        <span className="text-muted-foreground">Ação: </span>{b.recommendedAction}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Corrections Section */}
        {result && result.corrections.length > 0 && (
          <>
            <Separator />
            <div>
              <button
                className="flex items-center gap-2 text-xs font-medium text-primary w-full"
                onClick={() => setShowCorrections(!showCorrections)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {result.corrections.length} Correção(ões) Automática(s)
                {showCorrections ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
              {showCorrections && (
                <div className="mt-2 space-y-2">
                  {result.corrections.map((c, i) => (
                    <div key={i} className="p-2 rounded border border-border bg-muted/30 text-xs space-y-1">
                      <div className="font-medium">{c.field}</div>
                      <div className="text-muted-foreground">{c.reason}</div>
                      <div className="flex gap-3 text-[10px]">
                        <span>Confiança: {Math.round(c.confidence * 100)}%</span>
                        <span>Fonte: {c.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Module Scores */}
        {result && result.moduleScores && Object.keys(result.moduleScores).length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <div className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Scores por Módulo
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(result.moduleScores).map(([mod, score]) => (
                  <div key={mod} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-muted/30">
                    <span className="flex-1 text-muted-foreground capitalize">{mod}</span>
                    <span className={`font-mono font-bold ${
                      score >= 85 ? 'text-emerald-500' :
                      score >= 70 ? 'text-amber-500' :
                      'text-destructive'
                    }`}>
                      {Math.round(score)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {!isRunning && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={onClose}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: AuditOverallStatus }) {
  const config = AUDIT_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${config.color} text-[10px] font-semibold px-2 py-0.5`}>
      {config.label}
    </Badge>
  );
}
