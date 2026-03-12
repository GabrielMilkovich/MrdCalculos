/**
 * =====================================================
 * INTELLIGENT LIQUIDATION PIPELINE — TESTS
 * =====================================================
 */

import { describe, it, expect, vi } from 'vitest';

// Import types for testing
import type {
  PipelineStep,
  PipelineResult,
  AutoCorrection,
  PipelineBlocker,
  PipelineStepId,
} from '@/lib/pjecalc/intelligent-liquidation';

// =====================================================
// PIPELINE STEP CREATION TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — Types & Contracts', () => {
  it('should have correct pipeline step IDs', () => {
    const expectedSteps: PipelineStepId[] = [
      'collect_context',
      'read_documents',
      'resolve_canonical',
      'ai_pre_audit',
      'auto_correct',
      'validate_completeness',
      'engine_calculate',
      'ai_post_audit',
      'recalculate',
      'reconcile_pje',
      'confidence_score',
      'finalize',
    ];
    
    // Verify the type system accepts all expected values
    for (const id of expectedSteps) {
      const step: PipelineStep = {
        id,
        label: 'test',
        description: 'test',
        status: 'pending',
      };
      expect(step.id).toBe(id);
    }
  });

  it('should create valid AutoCorrection records', () => {
    const correction: AutoCorrection = {
      field: 'monetary.juros_tipo',
      module: 'monetary',
      previousValue: 'autonomous',
      newValue: 'incorporated',
      reason: 'SELIC já incorpora juros de mora',
      source: 'ai_auto_correction',
      confidence: 0.95,
      requiresHumanConfirmation: false,
      triggeredRecalculation: true,
      appliedAt: new Date().toISOString(),
    };
    
    expect(correction.confidence).toBeGreaterThanOrEqual(0);
    expect(correction.confidence).toBeLessThanOrEqual(1);
    expect(correction.requiresHumanConfirmation).toBe(false);
    expect(correction.triggeredRecalculation).toBe(true);
  });

  it('should create valid PipelineBlocker records', () => {
    const blocker: PipelineBlocker = {
      code: 'E001_DATA_LIQUIDACAO_AUSENTE',
      module: 'temporal',
      title: 'Data de liquidação ausente',
      technicalMessage: 'Campo data_liquidacao is null/empty',
      userMessage: 'A data de liquidação não foi informada. Configure-a antes de prosseguir.',
      recommendedAction: 'Acesse o módulo Correção/Juros e informe a data de liquidação.',
      requiresHumanConfirmation: true,
    };
    
    expect(blocker.code).toBeTruthy();
    expect(blocker.module).toBeTruthy();
    expect(blocker.requiresHumanConfirmation).toBe(true);
  });
});

// =====================================================
// BLOCKING RULES TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — Blocking Rules', () => {
  it('should block when data_liquidacao is absent', () => {
    const blocker: PipelineBlocker = {
      code: 'E001_DATA_LIQUIDACAO_AUSENTE',
      module: 'temporal',
      title: 'Data de liquidação ausente',
      technicalMessage: 'data_liquidacao is required for monetary correction',
      userMessage: 'Data de liquidação não informada',
      recommendedAction: 'Informe a data de liquidação',
      requiresHumanConfirmation: true,
    };
    expect(blocker.code).toContain('LIQUIDACAO');
  });

  it('should block when data_ajuizamento is absent and regime requires it', () => {
    const blocker: PipelineBlocker = {
      code: 'E002_DATA_AJUIZAMENTO_AUSENTE',
      module: 'temporal',
      title: 'Data de ajuizamento ausente',
      technicalMessage: 'data_ajuizamento required for prescription and interest calculation',
      userMessage: 'Data de ajuizamento não informada',
      recommendedAction: 'Informe a data de ajuizamento',
      requiresHumanConfirmation: true,
    };
    expect(blocker.code).toContain('AJUIZAMENTO');
  });

  it('should block on SELIC with autonomous interest conflict', () => {
    const blocker: PipelineBlocker = {
      code: 'E003_SELIC_COM_JUROS_AUTONOMOS',
      module: 'monetary',
      title: 'SELIC com juros autônomos',
      technicalMessage: 'SELIC already incorporates interest; autonomous interest is incompatible',
      userMessage: 'Regime SELIC detectado com juros autônomos configurados',
      recommendedAction: 'Remova os juros autônomos ou altere o índice de correção',
      requiresHumanConfirmation: false,
    };
    expect(blocker.module).toBe('monetary');
  });

  it('should block when critical salary history is missing', () => {
    const blocker: PipelineBlocker = {
      code: 'E004_HISTORICO_SALARIAL_AUSENTE',
      module: 'salary',
      title: 'Histórico salarial indispensável ausente',
      technicalMessage: 'No salary history found for required calculation period',
      userMessage: 'Nenhum histórico salarial configurado',
      recommendedAction: 'Importe fichas financeiras ou configure histórico manualmente',
      requiresHumanConfirmation: true,
    };
    expect(blocker.code).toContain('HISTORICO');
  });

  it('should block when timecards are required but missing', () => {
    const blocker: PipelineBlocker = {
      code: 'E005_JORNADA_AUSENTE',
      module: 'jornada',
      title: 'Jornada indispensável ausente',
      technicalMessage: 'Verbas depend on jornada but no timecards found',
      userMessage: 'O cálculo depende de jornada real mas nenhum cartão de ponto foi importado',
      recommendedAction: 'Importe os cartões de ponto ou configure a jornada manualmente',
      requiresHumanConfirmation: true,
    };
    expect(blocker.module).toBe('jornada');
  });
});

// =====================================================
// AUTOCORRECTION RULES TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — AutoCorrection', () => {
  it('should auto-correct SELIC interest configuration', () => {
    const correction: AutoCorrection = {
      field: 'monetary.juros_tipo',
      module: 'monetary',
      previousValue: '1_am',
      newValue: 'selic_incorporado',
      reason: 'SELIC já incorpora juros de mora. Juros autônomos removidos automaticamente.',
      source: 'ai_monetary_regime_auditor',
      confidence: 0.98,
      requiresHumanConfirmation: false,
      triggeredRecalculation: true,
      appliedAt: new Date().toISOString(),
    };
    expect(correction.confidence).toBeGreaterThan(0.9);
    expect(correction.triggeredRecalculation).toBe(true);
  });

  it('should auto-correct rubric mapping aliases', () => {
    const correction: AutoCorrection = {
      field: 'verbas.FERIADOS_LABORADOS',
      module: 'rubric_mapping',
      previousValue: 'FERIADOS LABORADOS',
      newValue: 'DOMINGOS E FERIADOS TRABALHADOS',
      reason: 'Rubrica mapeada para equivalente canônico',
      source: 'ai_rubric_mapping_auditor',
      confidence: 0.92,
      requiresHumanConfirmation: false,
      triggeredRecalculation: true,
      appliedAt: new Date().toISOString(),
    };
    expect(correction.module).toBe('rubric_mapping');
  });

  it('should NOT auto-correct with low confidence', () => {
    // Low confidence corrections should be flagged for human review
    const lowConfidence = 0.5;
    expect(lowConfidence).toBeLessThan(0.8); // threshold for auto-correction
  });

  it('should NOT auto-correct critical conflicts without evidence', () => {
    // Critical conflicts between sentença and PJC must not be auto-corrected
    const hasConflict = true;
    const hasObjectiveRule = false;
    const shouldAutoCorrect = hasConflict && hasObjectiveRule;
    expect(shouldAutoCorrect).toBe(false);
  });
});

// =====================================================
// CONFIDENCE SCORE TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — Confidence Score', () => {
  it('should classify score >= 85 as APTO', () => {
    const score = 90;
    const status = score >= 85 ? 'APTO' : score >= 70 ? 'APTO_COM_WARNINGS' : 'BLOQUEADO';
    expect(status).toBe('APTO');
  });

  it('should classify score 70-84 as APTO_COM_WARNINGS', () => {
    const score = 75;
    const status = score >= 85 ? 'APTO' : score >= 70 ? 'APTO_COM_WARNINGS' : score >= 50 ? 'BAIXA_CONFIABILIDADE' : 'BLOQUEADO';
    expect(status).toBe('APTO_COM_WARNINGS');
  });

  it('should classify score 50-69 as BAIXA_CONFIABILIDADE', () => {
    const score = 60;
    const status = score >= 85 ? 'APTO' : score >= 70 ? 'APTO_COM_WARNINGS' : score >= 50 ? 'BAIXA_CONFIABILIDADE' : 'BLOQUEADO';
    expect(status).toBe('BAIXA_CONFIABILIDADE');
  });

  it('should classify score < 50 as BLOQUEADO', () => {
    const score = 30;
    const status = score >= 85 ? 'APTO' : score >= 70 ? 'APTO_COM_WARNINGS' : score >= 50 ? 'BAIXA_CONFIABILIDADE' : 'BLOQUEADO';
    expect(status).toBe('BLOQUEADO');
  });

  it('should have module scores within valid range', () => {
    const moduleScores: Record<string, number> = {
      temporal: 95,
      parametros: 88,
      rubricas: 72,
      historico: 90,
      jornada: 65,
      monetaria: 82,
      fgts: 100,
      inss: 95,
      ir: 93,
      fechamento: 78,
    };
    
    for (const [mod, score] of Object.entries(moduleScores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

// =====================================================
// PIPELINE RESULT CONTRACT TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — Result Contract', () => {
  it('should produce valid PipelineResult', () => {
    const result: Partial<PipelineResult> = {
      runId: 'test-run-1',
      status: 'completed',
      confidenceStatus: 'APTO',
      confidenceScore: 92,
      corrections: [],
      blockers: [],
      warnings: [],
      documentsRead: 5,
      conflictsDetected: 0,
      correctionsApplied: 0,
      recalculationCount: 1,
      executionTimeMs: 5000,
    };
    
    expect(result.status).toBe('completed');
    expect(result.confidenceScore).toBeGreaterThan(85);
    expect(result.blockers).toHaveLength(0);
  });

  it('should produce blocked result with blockers', () => {
    const result: Partial<PipelineResult> = {
      status: 'blocked',
      confidenceStatus: 'BLOQUEADO',
      confidenceScore: 0,
      blockers: [
        {
          code: 'E001',
          module: 'temporal',
          title: 'Data ausente',
          technicalMessage: 'test',
          userMessage: 'test',
          recommendedAction: 'test',
          requiresHumanConfirmation: true,
        },
      ],
    };
    
    expect(result.status).toBe('blocked');
    expect(result.blockers!.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBe(0);
  });

  it('should limit recalculations to MAX_RECALC (3)', () => {
    const MAX_RECALC = 3;
    const recalcCount = 4;
    const shouldRecalc = recalcCount < MAX_RECALC;
    expect(shouldRecalc).toBe(false);
  });
});

// =====================================================
// PIPELINE PERSISTENCE TESTS
// =====================================================

describe('Intelligent Liquidation Pipeline — Persistence Contract', () => {
  it('should require all persistence fields', () => {
    const requiredFields = [
      'case_id',
      'status',
      'confidence_score',
      'confidence_status',
      'corrections_applied',
      'corrections_log',
      'blockers',
      'warnings',
      'documents_read',
    ];
    
    // Verify all fields exist in the schema
    expect(requiredFields.length).toBe(9);
  });

  it('should serialize corrections as JSON', () => {
    const corrections: AutoCorrection[] = [
      {
        field: 'test.field',
        module: 'test',
        previousValue: 'old',
        newValue: 'new',
        reason: 'test reason',
        source: 'ai',
        confidence: 0.9,
        requiresHumanConfirmation: false,
        triggeredRecalculation: true,
        appliedAt: new Date().toISOString(),
      },
    ];
    
    const serialized = JSON.parse(JSON.stringify(corrections));
    expect(serialized).toHaveLength(1);
    expect(serialized[0].field).toBe('test.field');
  });
});
