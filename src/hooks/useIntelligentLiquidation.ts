/**
 * =====================================================
 * useIntelligentLiquidation — Hook para pipeline inteligente
 * =====================================================
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  executarLiquidacaoInteligente,
  type PipelineResult,
  type PipelineStep,
  type PipelineProgressCallback,
} from '@/lib/pjecalc/intelligent-liquidation';

export interface IntelligentLiquidationState {
  isRunning: boolean;
  isDialogOpen: boolean;
  steps: PipelineStep[];
  result: PipelineResult | null;
  error: string | null;
  currentStepLabel: string;
  progress: number;
}

export function useIntelligentLiquidation(caseId: string | undefined) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<IntelligentLiquidationState>({
    isRunning: false,
    isDialogOpen: false,
    steps: [],
    result: null,
    error: null,
    currentStepLabel: '',
    progress: 0,
  });
  const abortRef = useRef(false);

  const onProgress: PipelineProgressCallback = useCallback((step, allSteps) => {
    if (abortRef.current) return;
    
    const completed = allSteps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
    const total = allSteps.length;
    const progress = Math.round((completed / total) * 100);
    
    setState(prev => ({
      ...prev,
      steps: [...allSteps],
      currentStepLabel: step.status === 'running' ? step.label : prev.currentStepLabel,
      progress,
    }));
  }, []);

  const execute = useCallback(async () => {
    if (!caseId) {
      toast.error('ID do caso não encontrado');
      return;
    }
    
    abortRef.current = false;
    setState({
      isRunning: true,
      isDialogOpen: true,
      steps: [],
      result: null,
      error: null,
      currentStepLabel: 'Iniciando pipeline...',
      progress: 0,
    });

    try {
      const result = await executarLiquidacaoInteligente(caseId, onProgress);
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        result,
        progress: 100,
        currentStepLabel: result.status === 'completed' ? 'Concluído' : 
          result.status === 'blocked' ? 'Bloqueado' : 
          result.status === 'needs_review' ? 'Revisão necessária' : 'Falhou',
      }));

      // Invalidate all pjecalc queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['pjecalc_full', caseId] });
      
      if (result.status === 'completed') {
        const liquido = result.calculationResult?.result.resumo.liquido_reclamante;
        toast.success(`Liquidação inteligente concluída! Líquido: R$ ${liquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '—'}`);
      } else if (result.status === 'blocked') {
        toast.error(`Liquidação bloqueada: ${result.blockers.length} problema(s) crítico(s) detectado(s)`);
      } else if (result.status === 'needs_review') {
        toast.warning('Liquidação requer revisão humana antes de ser liberada');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: msg,
        currentStepLabel: 'Erro',
      }));
      toast.error(`Erro no pipeline: ${msg}`);
    }
  }, [caseId, onProgress, queryClient]);

  const closeDialog = useCallback(() => {
    if (!state.isRunning) {
      setState(prev => ({ ...prev, isDialogOpen: false }));
    }
  }, [state.isRunning]);

  const abort = useCallback(() => {
    abortRef.current = true;
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStepLabel: 'Cancelado',
    }));
  }, []);

  return {
    ...state,
    execute,
    closeDialog,
    abort,
  };
}
