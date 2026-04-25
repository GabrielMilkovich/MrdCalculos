/**
 * =====================================================
 * HOOK: useDomainOrchestrator
 * =====================================================
 * 
 * Connects the domain orchestrator to the UI layer.
 * Runs the full calculation pipeline:
 * 1. Resolve judicial title
 * 2. Build timeline
 * 3. Execute verba modules
 * 4. Apply reflections
 * 5. Apply offsets
 * 6. Calculate incidences
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type {
  LaborCase, EmploymentContract, CalculationScenario,
  JudicialTitleVersion, CalculationItem, CalculationCompetency,
  InconsistencyFlag, AuditTrailEntry,
} from '@/domain/types';
import { orchestrateCalculation, type OrchestratorResult } from '@/lib/pjecalc/domain-orchestrator';
import type { DomainPaidItem } from '@/domain/offset-engine';
import { logger } from '@/lib/logger';
import type { PjeVerba, PjeHistoricoSalarial, PjeCartaoPonto, PjeFalta, PjeFerias } from '@/lib/pjecalc/engine-types';
import Decimal from 'decimal.js';

export interface DomainOrchestratorInput {
  laborCase: LaborCase;
  contract: EmploymentContract;
  scenario: CalculationScenario;
  titleVersions: JudicialTitleVersion[];
  verbas: PjeVerba[];
  historicos: PjeHistoricoSalarial[];
  cartaoPonto: PjeCartaoPonto[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
  paidItems?: DomainPaidItem[];
}

export interface DomainOrchestratorOutput {
  items: CalculationItem[];
  timeline: CalculationCompetency[];
  inconsistencies: InconsistencyFlag[];
  totalBruto: number;
  totalLiquido: number;
  audit: AuditTrailEntry[];
  reflectionCount: number;
  offsetCount: number;
}

export function useDomainOrchestrator() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DomainOrchestratorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: DomainOrchestratorInput) => {
    setIsRunning(true);
    setError(null);

    try {
      // Step 1: Run orchestrator (title + timeline + verba modules + reflexos materializados)
      const orchResult: OrchestratorResult = orchestrateCalculation({
        laborCase: input.laborCase,
        contract: input.contract,
        scenario: input.scenario,
        titleVersions: input.titleVersions,
        verbas: input.verbas,
        historicos: input.historicos,
        cartaoPonto: input.cartaoPonto,
        faltas: input.faltas,
        ferias: input.ferias,
      });

      const items = orchResult.items;
      const audit = [...orchResult.auditSummary];
      const reflectionCount = items.filter(item => item.formula_aplicada.startsWith('reflexo:')).length;

      // Step 2: Apply offsets (offset-engine removed — no-op)
      const offsetCount = 0;
      if (input.paidItems && input.paidItems.length > 0) {
        logger.warn('applyDomainOffsets removed — offsets not applied');
      }

      // Step 3: Calculate totals
      let totalBruto = new Decimal(0);
      let totalLiquido = new Decimal(0);
      for (const item of items) {
        totalBruto = totalBruto.plus(item.valor_devido);
        totalLiquido = totalLiquido.plus(item.total);
      }

      const output: DomainOrchestratorOutput = {
        items,
        timeline: orchResult.timeline,
        inconsistencies: orchResult.inconsistencies,
        totalBruto: totalBruto.toNumber(),
        totalLiquido: totalLiquido.toNumber(),
        audit,
        reflectionCount,
        offsetCount,
      };

      setResult(output);
      return output;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(`Erro no cálculo de domínio: ${msg}`);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { execute, isRunning, result, error };
}
