/**
 * =====================================================
 * HOOK: useAuditAgent
 * =====================================================
 * React hook for AI Audit Agent interactions
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuditService } from '@/lib/pjecalc/audit/service';
import type { AuditRunType, AuditRunDetail, AuditRunSummary } from '@/lib/pjecalc/audit/types';
import { toast } from 'sonner';

export function useAuditAgent(caseId: string | undefined, calculoId?: string | null) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  // Latest audit run
  const latestRun = useQuery({
    queryKey: ['audit-latest', caseId],
    queryFn: () => AuditService.getLatestRun(caseId!),
    enabled: !!caseId,
    staleTime: 30_000,
  });

  // Run history
  const history = useQuery({
    queryKey: ['audit-history', caseId],
    queryFn: () => AuditService.getRunHistory(caseId!),
    enabled: !!caseId,
    staleTime: 60_000,
  });

  // Run audit mutation
  const runAudit = useMutation({
    mutationFn: async (params: { action: AuditRunType; context?: Record<string, unknown> }) => {
      setIsRunning(true);
      return AuditService.runAudit(caseId!, calculoId || null, params.action, params.context);
    },
    onSuccess: (data: AuditRunSummary) => {
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ['audit-latest', caseId] });
      queryClient.invalidateQueries({ queryKey: ['audit-history', caseId] });

      if (data.blockers > 0) {
        toast.error(`Auditoria: ${data.blockers} bloqueio(s) encontrado(s)`, {
          description: `Status: ${data.status} | Confiança: ${data.confidence}%`,
        });
      } else if (data.warnings > 0) {
        toast.warning(`Auditoria: ${data.warnings} alerta(s)`, {
          description: `Status: ${data.status} | Confiança: ${data.confidence}%`,
        });
      } else {
        toast.success('Auditoria concluída', {
          description: `Status: ${data.status} | Confiança: ${data.confidence}%`,
        });
      }
    },
    onError: (err: Error) => {
      setIsRunning(false);
      toast.error('Erro na auditoria', { description: err.message });
    },
  });

  // Resolve finding
  const resolveFinding = useMutation({
    mutationFn: (params: { findingId: string; note: string }) =>
      AuditService.resolveFinding(params.findingId, params.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-latest', caseId] });
      toast.success('Finding resolvido');
    },
  });

  const runPreCalculo = useCallback(() => {
    runAudit.mutate({ action: 'pre_calculo' });
  }, [runAudit]);

  const runPosCalculo = useCallback(() => {
    runAudit.mutate({ action: 'pos_calculo' });
  }, [runAudit]);

  const runReconciliacao = useCallback((pjeData?: Record<string, unknown>) => {
    runAudit.mutate({ action: 'reconciliacao', context: pjeData ? { pje_data: pjeData } : undefined });
  }, [runAudit]);

  const runFull = useCallback(() => {
    runAudit.mutate({ action: 'full' });
  }, [runAudit]);

  return {
    latestRun: latestRun.data as AuditRunDetail | null | undefined,
    isLoadingLatest: latestRun.isLoading,
    history: history.data || [],
    isRunning,
    runPreCalculo,
    runPosCalculo,
    runReconciliacao,
    runFull,
    resolveFinding: resolveFinding.mutate,
  };
}
