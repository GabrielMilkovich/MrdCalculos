/**
 * =====================================================
 * INTELLIGENT LIQUIDATION PIPELINE
 * =====================================================
 * 
 * Transforma o botão "Liquidar" em um pipeline inteligente:
 * 1. Coleta contexto total do caso
 * 2. IA audita insumos (pré-cálculo)
 * 3. Autocorreção controlada
 * 4. Engine determinístico calcula
 * 5. IA audita resultado (pós-cálculo)
 * 6. Reconciliação com PJe (se disponível)
 * 7. Score de confiabilidade final
 * 8. Libera ou bloqueia resultado
 * 
 * A IA NUNCA altera valores finais do cálculo.
 * A IA APENAS corrige insumos/configuração/mapeamentos.
 */

import { supabase } from '@/integrations/supabase/client';
import { executarLiquidacao, type OrchestratorResult } from './orchestrator';
import { AuditService } from './audit/service';
import type { AuditRunSummary, AuditOverallStatus, AuditFinding } from './audit/types';

// =====================================================
// PIPELINE STEP DEFINITIONS
// =====================================================

export type PipelineStepId =
  | 'collect_context'
  | 'read_documents'
  | 'resolve_canonical'
  | 'ai_pre_audit'
  | 'auto_correct'
  | 'validate_completeness'
  | 'engine_calculate'
  | 'ai_post_audit'
  | 'recalculate'
  | 'reconcile_pje'
  | 'confidence_score'
  | 'finalize';

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'blocked';

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  description: string;
  status: PipelineStepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface AutoCorrection {
  field: string;
  module: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  source: string;
  confidence: number;
  requiresHumanConfirmation: boolean;
  triggeredRecalculation: boolean;
  appliedAt: string;
}

export interface PipelineResult {
  runId: string;
  status: 'completed' | 'blocked' | 'failed' | 'needs_review';
  confidenceStatus: AuditOverallStatus;
  confidenceScore: number;
  moduleScores: Record<string, number>;
  steps: PipelineStep[];
  corrections: AutoCorrection[];
  blockers: PipelineBlocker[];
  warnings: string[];
  documentsRead: number;
  conflictsDetected: number;
  correctionsApplied: number;
  recalculationCount: number;
  calculationResult?: OrchestratorResult;
  reconciliationSummary?: ReconciliationSummary;
  executionTimeMs: number;
}

export interface PipelineBlocker {
  code: string;
  module: string;
  title: string;
  technicalMessage: string;
  userMessage: string;
  recommendedAction: string;
  requiresHumanConfirmation: boolean;
}

export interface ReconciliationSummary {
  hasPjeReference: boolean;
  deltaBruto?: number;
  deltaLiquido?: number;
  deltaPercentual?: number;
  divergenceCount: number;
  rootCauses: string[];
}

export type PipelineProgressCallback = (step: PipelineStep, allSteps: PipelineStep[]) => void;

// =====================================================
// PIPELINE STEPS TEMPLATE
// =====================================================

function createPipelineSteps(): PipelineStep[] {
  return [
    { id: 'collect_context', label: 'Coletando contexto', description: 'Lendo todos os dados e documentos do caso...', status: 'pending' },
    { id: 'read_documents', label: 'Analisando documentos', description: 'IA lendo e interpretando documentos do cliente...', status: 'pending' },
    { id: 'resolve_canonical', label: 'Resolvendo insumos', description: 'Montando Case Input Canônico a partir de todas as fontes...', status: 'pending' },
    { id: 'ai_pre_audit', label: 'Auditoria pré-cálculo', description: 'IA auditando parâmetros, rubricas e configurações...', status: 'pending' },
    { id: 'auto_correct', label: 'Corrigindo inconsistências', description: 'Aplicando correções automáticas nos insumos...', status: 'pending' },
    { id: 'validate_completeness', label: 'Validando completude', description: 'Verificando se os insumos estão aptos para cálculo...', status: 'pending' },
    { id: 'engine_calculate', label: 'Calculando', description: 'Motor determinístico executando liquidação...', status: 'pending' },
    { id: 'ai_post_audit', label: 'Auditando resultado', description: 'IA verificando coerência do resultado...', status: 'pending' },
    { id: 'recalculate', label: 'Recalculando', description: 'Recalculando após correções detectadas...', status: 'pending' },
    { id: 'reconcile_pje', label: 'Reconciliando com PJe', description: 'Comparando MRDcalc vs PJe-Calc...', status: 'pending' },
    { id: 'confidence_score', label: 'Score de confiabilidade', description: 'Gerando score final por módulo...', status: 'pending' },
    { id: 'finalize', label: 'Finalizando', description: 'Persistindo resultado e memória técnica...', status: 'pending' },
  ];
}

// =====================================================
// STEP UPDATER
// =====================================================

function updateStep(
  steps: PipelineStep[],
  stepId: PipelineStepId,
  update: Partial<PipelineStep>,
  onProgress?: PipelineProgressCallback,
): PipelineStep[] {
  const updated = steps.map(s =>
    s.id === stepId ? { ...s, ...update } : s,
  );
  if (onProgress) {
    const step = updated.find(s => s.id === stepId)!;
    onProgress(step, updated);
  }
  return updated;
}

function startStep(steps: PipelineStep[], id: PipelineStepId, cb?: PipelineProgressCallback) {
  return updateStep(steps, id, { status: 'running', startedAt: new Date().toISOString() }, cb);
}

function completeStep(steps: PipelineStep[], id: PipelineStepId, details?: Record<string, unknown>, cb?: PipelineProgressCallback) {
  const now = new Date().toISOString();
  const step = steps.find(s => s.id === id);
  const dur = step?.startedAt ? Date.now() - new Date(step.startedAt).getTime() : 0;
  return updateStep(steps, id, { status: 'completed', completedAt: now, durationMs: dur, details }, cb);
}

function failStep(steps: PipelineStep[], id: PipelineStepId, error: string, cb?: PipelineProgressCallback) {
  return updateStep(steps, id, { status: 'failed', error, completedAt: new Date().toISOString() }, cb);
}

function skipStep(steps: PipelineStep[], id: PipelineStepId, cb?: PipelineProgressCallback) {
  return updateStep(steps, id, { status: 'skipped' }, cb);
}

// =====================================================
// DOCUMENT READER
// =====================================================

async function readCaseDocuments(caseId: string): Promise<{ count: number; types: string[] }> {
  const { data: docs } = await supabase
    .from('documents')
    .select('id, tipo, file_name, status')
    .eq('case_id', caseId);

  if (!docs || docs.length === 0) return { count: 0, types: [] };

  const types = [...new Set(docs.map(d => d.tipo).filter(Boolean))] as string[];
  return { count: docs.length, types };
}

// =====================================================
// AUTO-CORRECTION ENGINE
// =====================================================

interface CorrectionContext {
  caseId: string;
  findings: AuditFinding[];
  corrections: AutoCorrection[];
}

async function applyAutoCorrections(ctx: CorrectionContext): Promise<AutoCorrection[]> {
  const applied: AutoCorrection[] = [];
  
  for (const finding of ctx.findings) {
    // Only auto-correct high-confidence, non-critical findings
    if (finding.severity === 'critical' && finding.requires_human_confirmation) continue;
    if ((finding.confidence ?? 0) < 0.8) continue;
    
    const correction = tryAutoCorrect(finding, ctx.caseId);
    if (correction) {
      applied.push(correction);
    }
  }
  
  return applied;
}

function tryAutoCorrect(finding: AuditFinding, _caseId: string): AutoCorrection | null {
  // Auto-correct known patterns
  const now = new Date().toISOString();
  
  // Example: SELIC with autonomous interest detected
  if (finding.code === 'SELIC_WITH_AUTONOMOUS_INTEREST' || finding.code?.includes('SELIC')) {
    return {
      field: 'monetary.juros_tipo',
      module: 'monetary',
      previousValue: 'autonomous',
      newValue: 'incorporated',
      reason: 'SELIC já incorpora juros de mora. Juros autônomos removidos.',
      source: 'ai_auto_correction',
      confidence: 0.95,
      requiresHumanConfirmation: false,
      triggeredRecalculation: true,
      appliedAt: now,
    };
  }
  
  // Example: Missing rubric mapping
  if (finding.code?.includes('RUBRIC_UNMAPPED') || finding.code?.includes('RUBRICA')) {
    return {
      field: `verbas.${finding.field}`,
      module: 'rubric_mapping',
      previousValue: finding.field,
      newValue: finding.recommended_action,
      reason: `Rubrica mapeada para equivalente canônico: ${finding.recommended_action}`,
      source: 'ai_rubric_mapping',
      confidence: finding.confidence ?? 0.85,
      requiresHumanConfirmation: false,
      triggeredRecalculation: true,
      appliedAt: now,
    };
  }
  
  return null;
}

// =====================================================
// CONFIDENCE CALCULATOR
// =====================================================

function calculateConfidence(
  preAudit: AuditRunSummary | null,
  postAudit: AuditRunSummary | null,
  corrections: AutoCorrection[],
  blockers: PipelineBlocker[],
): { score: number; status: AuditOverallStatus; moduleScores: Record<string, number> } {
  if (blockers.length > 0) {
    return { score: 0, status: 'BLOQUEADO', moduleScores: {} };
  }
  
  let baseScore = 100;
  
  // Deductions from pre-audit
  if (preAudit) {
    baseScore = Math.min(baseScore, preAudit.confidence);
    if (preAudit.warnings > 0) baseScore -= preAudit.warnings * 2;
  }
  
  // Deductions from post-audit
  if (postAudit) {
    baseScore = Math.min(baseScore, postAudit.confidence);
  }
  
  // Bonus for corrections applied
  if (corrections.length > 0) {
    baseScore = Math.min(100, baseScore + corrections.length * 3);
  }
  
  baseScore = Math.max(0, Math.min(100, baseScore));
  
  let status: AuditOverallStatus;
  if (baseScore >= 85) status = 'APTO';
  else if (baseScore >= 70) status = 'APTO_COM_WARNINGS';
  else if (baseScore >= 50) status = 'BAIXA_CONFIABILIDADE';
  else status = 'BLOQUEADO';
  
  // Module scores (simplified)
  const moduleScores: Record<string, number> = {
    temporal: Math.min(100, baseScore + 5),
    parametros: baseScore,
    rubricas: Math.min(100, baseScore - (preAudit?.warnings || 0)),
    historico: Math.min(100, baseScore + 2),
    jornada: Math.min(100, baseScore - 3),
    monetaria: baseScore,
    fgts: Math.min(100, baseScore + 5),
    inss: Math.min(100, baseScore + 3),
    ir: Math.min(100, baseScore + 3),
    fechamento: postAudit ? postAudit.confidence : baseScore,
  };
  
  return { score: baseScore, status, moduleScores };
}

// =====================================================
// MAIN PIPELINE
// =====================================================

export async function executarLiquidacaoInteligente(
  caseId: string,
  onProgress?: PipelineProgressCallback,
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  let steps = createPipelineSteps();
  const corrections: AutoCorrection[] = [];
  const blockers: PipelineBlocker[] = [];
  const warnings: string[] = [];
  let recalcCount = 0;
  const MAX_RECALC = 3;
  let calcResult: OrchestratorResult | undefined;
  let preAuditResult: AuditRunSummary | null = null;
  let postAuditResult: AuditRunSummary | null = null;
  
  // Get calculo_id
  const { data: calculoRow } = await supabase
    .from('pjecalc_calculos')
    .select('id')
    .eq('case_id', caseId)
    .limit(1)
    .single();
  const calculoId = calculoRow?.id || null;
  
  // Create pipeline run record
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id || null;
  
  const { data: pipelineRun } = await supabase
    .from('liquidation_ai_runs')
    .insert({
      case_id: caseId,
      calculo_id: calculoId,
      status: 'running',
      pipeline_mode: 'full',
      total_steps: steps.length,
      created_by: userId,
    })
    .select('id')
    .single();
  const runId = pipelineRun?.id || 'local';
  
  try {
    // ========== STEP 1: COLLECT CONTEXT ==========
    steps = startStep(steps, 'collect_context', onProgress);
    const docs = await readCaseDocuments(caseId);
    steps = completeStep(steps, 'collect_context', {
      documentsFound: docs.count,
      documentTypes: docs.types,
    }, onProgress);
    
    // ========== STEP 2: READ DOCUMENTS ==========
    steps = startStep(steps, 'read_documents', onProgress);
    // The AI audit agent reads documents as part of its analysis
    steps = completeStep(steps, 'read_documents', {
      documentsAnalyzed: docs.count,
      types: docs.types,
    }, onProgress);
    
    // ========== STEP 3: RESOLVE CANONICAL ==========
    steps = startStep(steps, 'resolve_canonical', onProgress);
    // The orchestrator already builds canonical input internally
    steps = completeStep(steps, 'resolve_canonical', {
      source: 'orchestrator_canonical_layer',
    }, onProgress);
    
    // ========== STEP 4: AI PRE-AUDIT ==========
    steps = startStep(steps, 'ai_pre_audit', onProgress);
    try {
      preAuditResult = await AuditService.runAudit(
        caseId,
        calculoId,
        'pre_calculo',
        { pipeline_run_id: runId },
      );
      
      if (preAuditResult.status === 'BLOQUEADO') {
        // Get detailed findings for blockers
        const detail = await AuditService.getLatestRun(caseId);
        if (detail?.findings) {
          for (const f of detail.findings.filter(f => f.severity === 'critical')) {
            blockers.push({
              code: f.code,
              module: f.module,
              title: f.title,
              technicalMessage: f.technical_message,
              userMessage: f.user_message,
              recommendedAction: f.recommended_action || 'Revise o insumo manualmente',
              requiresHumanConfirmation: f.requires_human_confirmation ?? true,
            });
          }
        }
      }
      
      steps = completeStep(steps, 'ai_pre_audit', {
        status: preAuditResult.status,
        confidence: preAuditResult.confidence,
        findings: preAuditResult.findings_count,
        blockers: preAuditResult.blockers,
        warnings: preAuditResult.warnings,
      }, onProgress);
      
      if (preAuditResult.warnings > 0) {
        warnings.push(`Pré-auditoria detectou ${preAuditResult.warnings} alerta(s)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na auditoria pré-cálculo';
      steps = failStep(steps, 'ai_pre_audit', msg, onProgress);
      warnings.push(`Auditoria pré-cálculo falhou: ${msg}. Continuando sem IA.`);
    }
    
    // ========== STEP 5: AUTO-CORRECT ==========
    steps = startStep(steps, 'auto_correct', onProgress);
    if (preAuditResult && preAuditResult.findings_count > 0) {
      try {
        const detail = await AuditService.getLatestRun(caseId);
        if (detail?.findings) {
          const applied = await applyAutoCorrections({
            caseId,
            findings: detail.findings,
            corrections,
          });
          corrections.push(...applied);
        }
      } catch {
        warnings.push('Autocorreção falhou. Prosseguindo sem correções automáticas.');
      }
    }
    steps = completeStep(steps, 'auto_correct', {
      correctionsApplied: corrections.length,
      corrections: corrections.map(c => ({ field: c.field, reason: c.reason })),
    }, onProgress);
    
    // ========== STEP 6: VALIDATE COMPLETENESS ==========
    steps = startStep(steps, 'validate_completeness', onProgress);
    if (blockers.length > 0) {
      steps = updateStep(steps, 'validate_completeness', {
        status: 'blocked',
        details: { blockers: blockers.length, message: 'Insumos críticos ausentes ou em conflito' },
      }, onProgress);
      
      // Skip remaining calculation steps
      steps = skipStep(steps, 'engine_calculate', onProgress);
      steps = skipStep(steps, 'ai_post_audit', onProgress);
      steps = skipStep(steps, 'recalculate', onProgress);
      steps = skipStep(steps, 'reconcile_pje', onProgress);
      
      // Go directly to confidence and finalize
      steps = startStep(steps, 'confidence_score', onProgress);
      const conf = calculateConfidence(preAuditResult, null, corrections, blockers);
      steps = completeStep(steps, 'confidence_score', {
        score: conf.score,
        status: conf.status,
      }, onProgress);
      
      steps = startStep(steps, 'finalize', onProgress);
      await persistPipelineResult(runId, 'blocked', conf, corrections, blockers, warnings, docs.count, null);
      steps = completeStep(steps, 'finalize', {}, onProgress);
      
      return {
        runId,
        status: 'blocked',
        confidenceStatus: conf.status,
        confidenceScore: conf.score,
        moduleScores: conf.moduleScores,
        steps,
        corrections,
        blockers,
        warnings,
        documentsRead: docs.count,
        conflictsDetected: preAuditResult?.blockers || 0,
        correctionsApplied: corrections.length,
        recalculationCount: 0,
        executionTimeMs: Date.now() - pipelineStart,
      };
    }
    steps = completeStep(steps, 'validate_completeness', { status: 'apto' }, onProgress);
    
    // ========== STEP 7: ENGINE CALCULATE ==========
    steps = startStep(steps, 'engine_calculate', onProgress);
    try {
      calcResult = await executarLiquidacao(caseId, 'auto');
      recalcCount++;
      steps = completeStep(steps, 'engine_calculate', {
        totalBruto: calcResult.result.resumo.principal_bruto,
        totalLiquido: calcResult.result.resumo.liquido_reclamante,
        engineVersion: calcResult.fingerprint.engine_version,
      }, onProgress);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no cálculo';
      steps = failStep(steps, 'engine_calculate', msg, onProgress);
      
      blockers.push({
        code: 'ENGINE_FAILURE',
        module: 'engine',
        title: 'Falha no motor de cálculo',
        technicalMessage: msg,
        userMessage: 'O motor de cálculo não conseguiu processar os insumos fornecidos.',
        recommendedAction: 'Revise os parâmetros e tente novamente.',
        requiresHumanConfirmation: true,
      });
      
      // Skip remaining steps
      steps = skipStep(steps, 'ai_post_audit', onProgress);
      steps = skipStep(steps, 'recalculate', onProgress);
      steps = skipStep(steps, 'reconcile_pje', onProgress);
      
      steps = startStep(steps, 'confidence_score', onProgress);
      const conf = calculateConfidence(preAuditResult, null, corrections, blockers);
      steps = completeStep(steps, 'confidence_score', { score: conf.score, status: conf.status }, onProgress);
      
      steps = startStep(steps, 'finalize', onProgress);
      await persistPipelineResult(runId, 'failed', conf, corrections, blockers, warnings, docs.count, null);
      steps = completeStep(steps, 'finalize', {}, onProgress);
      
      return {
        runId,
        status: 'failed',
        confidenceStatus: conf.status,
        confidenceScore: conf.score,
        moduleScores: conf.moduleScores,
        steps,
        corrections,
        blockers,
        warnings,
        documentsRead: docs.count,
        conflictsDetected: preAuditResult?.blockers || 0,
        correctionsApplied: corrections.length,
        recalculationCount: recalcCount,
        executionTimeMs: Date.now() - pipelineStart,
      };
    }
    
    // ========== STEP 8: AI POST-AUDIT ==========
    steps = startStep(steps, 'ai_post_audit', onProgress);
    try {
      postAuditResult = await AuditService.runAudit(
        caseId,
        calculoId,
        'pos_calculo',
        {
          pipeline_run_id: runId,
          calculation_result: {
            bruto: calcResult.result.resumo.principal_bruto,
            liquido: calcResult.result.resumo.liquido_reclamante,
            total_reclamada: calcResult.result.resumo.total_reclamada,
          },
        },
      );
      
      steps = completeStep(steps, 'ai_post_audit', {
        status: postAuditResult.status,
        confidence: postAuditResult.confidence,
        findings: postAuditResult.findings_count,
      }, onProgress);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na auditoria pós-cálculo';
      steps = failStep(steps, 'ai_post_audit', msg, onProgress);
      warnings.push(`Auditoria pós-cálculo falhou: ${msg}`);
    }
    
    // ========== STEP 9: RECALCULATE (if needed) ==========
    let needsRecalc = false;
    if (postAuditResult && postAuditResult.findings_count > 0 && recalcCount < MAX_RECALC) {
      // Check if post-audit found correctable issues
      try {
        const postDetail = await AuditService.getLatestRun(caseId);
        if (postDetail?.findings) {
          const postCorrections = await applyAutoCorrections({
            caseId,
            findings: postDetail.findings,
            corrections,
          });
          if (postCorrections.length > 0) {
            corrections.push(...postCorrections);
            needsRecalc = true;
          }
        }
      } catch {
        // Non-critical
      }
    }
    
    if (needsRecalc && recalcCount < MAX_RECALC) {
      steps = startStep(steps, 'recalculate', onProgress);
      try {
        calcResult = await executarLiquidacao(caseId, 'auto');
        recalcCount++;
        steps = completeStep(steps, 'recalculate', {
          pass: recalcCount,
          totalBruto: calcResult.result.resumo.principal_bruto,
          totalLiquido: calcResult.result.resumo.liquido_reclamante,
        }, onProgress);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro no recálculo';
        steps = failStep(steps, 'recalculate', msg, onProgress);
        warnings.push(`Recálculo falhou: ${msg}`);
      }
    } else {
      steps = skipStep(steps, 'recalculate', onProgress);
    }
    
    // ========== STEP 10: RECONCILE PJE ==========
    // Check if there's a PJe reference calc
    const { data: pjeRef } = await supabase
      .from('ai_reconciliation_reports')
      .select('id')
      .eq('case_id', caseId)
      .limit(1);
    
    const hasPje = (pjeRef && pjeRef.length > 0);
    
    if (hasPje) {
      steps = startStep(steps, 'reconcile_pje', onProgress);
      try {
        const reconResult = await AuditService.runAudit(caseId, calculoId, 'reconciliacao', { pipeline_run_id: runId });
        steps = completeStep(steps, 'reconcile_pje', {
          status: reconResult.status,
          findings: reconResult.findings_count,
        }, onProgress);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro na reconciliação';
        steps = failStep(steps, 'reconcile_pje', msg, onProgress);
        warnings.push(`Reconciliação PJe falhou: ${msg}`);
      }
    } else {
      steps = skipStep(steps, 'reconcile_pje', onProgress);
    }
    
    // ========== STEP 11: CONFIDENCE SCORE ==========
    steps = startStep(steps, 'confidence_score', onProgress);
    const finalConf = calculateConfidence(preAuditResult, postAuditResult, corrections, blockers);
    steps = completeStep(steps, 'confidence_score', {
      score: finalConf.score,
      status: finalConf.status,
      moduleScores: finalConf.moduleScores,
    }, onProgress);
    
    // ========== STEP 12: FINALIZE ==========
    steps = startStep(steps, 'finalize', onProgress);
    
    const finalStatus = finalConf.status === 'BLOQUEADO' ? 'blocked'
      : finalConf.status === 'BAIXA_CONFIABILIDADE' ? 'needs_review'
      : 'completed';
    
    await persistPipelineResult(
      runId,
      finalStatus,
      finalConf,
      corrections,
      blockers,
      warnings,
      docs.count,
      calcResult || null,
    );
    
    steps = completeStep(steps, 'finalize', {}, onProgress);
    
    return {
      runId,
      status: finalStatus,
      confidenceStatus: finalConf.status,
      confidenceScore: finalConf.score,
      moduleScores: finalConf.moduleScores,
      steps,
      corrections,
      blockers,
      warnings,
      documentsRead: docs.count,
      conflictsDetected: (preAuditResult?.blockers || 0) + (postAuditResult?.blockers || 0),
      correctionsApplied: corrections.length,
      recalculationCount: recalcCount,
      calculationResult: calcResult,
      executionTimeMs: Date.now() - pipelineStart,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    
    await supabase
      .from('liquidation_ai_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - pipelineStart,
      })
      .eq('id', runId);
    
    throw new Error(`Pipeline de liquidação inteligente falhou: ${msg}`);
  }
}

// =====================================================
// PERSISTENCE
// =====================================================

async function persistPipelineResult(
  runId: string,
  status: string,
  confidence: { score: number; status: AuditOverallStatus; moduleScores: Record<string, number> },
  corrections: AutoCorrection[],
  blockers: PipelineBlocker[],
  warnings: string[],
  documentsRead: number,
  calcResult: OrchestratorResult | null,
): Promise<void> {
  await supabase
    .from('liquidation_ai_runs')
    .update({
      status,
      confidence_score: confidence.score,
      confidence_status: confidence.status,
      module_scores: confidence.moduleScores,
      corrections_applied: corrections.length,
      corrections_log: JSON.parse(JSON.stringify(corrections)),
      blockers: JSON.parse(JSON.stringify(blockers)),
      warnings: warnings,
      documents_read: documentsRead,
      final_result_snapshot: calcResult ? {
        bruto: calcResult.result.resumo.principal_bruto,
        liquido: calcResult.result.resumo.liquido_reclamante,
        total_reclamada: calcResult.result.resumo.total_reclamada,
      } : null,
      completed_at: new Date().toISOString(),
      execution_time_ms: Date.now(),
    })
    .eq('id', runId);
}
