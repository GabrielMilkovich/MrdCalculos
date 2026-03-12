/**
 * =====================================================
 * AI AUDIT SERVICE — Client-side service layer
 * =====================================================
 */

import { supabase } from '@/integrations/supabase/client';
import type { AuditRunType, AuditRunSummary, AuditRun, AuditFinding, ConfidenceScore, AuditRunDetail } from './types';

export class AuditService {
  /**
   * Trigger an AI audit run
   */
  static async runAudit(
    caseId: string,
    calculoId: string | null,
    action: AuditRunType = 'full',
    context?: Record<string, unknown>,
  ): Promise<AuditRunSummary> {
    const { data, error } = await supabase.functions.invoke('ai-audit-agent', {
      body: {
        action,
        case_id: caseId,
        calculo_id: calculoId,
        context,
      },
    });

    if (error) throw new Error(error.message || 'Erro ao executar auditoria');
    if (data?.error) throw new Error(data.error);
    return data as AuditRunSummary;
  }

  /**
   * Get latest audit run for a case
   */
  static async getLatestRun(caseId: string): Promise<AuditRunDetail | null> {
    const { data: run, error } = await supabase
      .from('ai_audit_runs')
      .select('*')
      .eq('case_id', caseId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !run) return null;

    const [findingsRes, scoresRes] = await Promise.all([
      supabase.from('ai_audit_findings').select('*').eq('run_id', run.id).order('severity'),
      supabase.from('ai_confidence_scores').select('*').eq('run_id', run.id),
    ]);

    return {
      ...run,
      findings: (findingsRes.data || []) as AuditFinding[],
      scores: (scoresRes.data || []) as ConfidenceScore[],
      reconciliation: null,
    } as AuditRunDetail;
  }

  /**
   * Get all audit runs for a case
   */
  static async getRunHistory(caseId: string): Promise<AuditRun[]> {
    const { data, error } = await supabase
      .from('ai_audit_runs')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as AuditRun[];
  }

  /**
   * Get findings for a specific run
   */
  static async getFindings(runId: string): Promise<AuditFinding[]> {
    const { data, error } = await supabase
      .from('ai_audit_findings')
      .select('*')
      .eq('run_id', runId)
      .order('severity');

    if (error) throw new Error(error.message);
    return (data || []) as AuditFinding[];
  }

  /**
   * Resolve a finding
   */
  static async resolveFinding(findingId: string, note: string): Promise<void> {
    const { error } = await supabase
      .from('ai_audit_findings')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_note: note,
      })
      .eq('id', findingId);

    if (error) throw new Error(error.message);
  }

  /**
   * Get confidence scores for a run
   */
  static async getConfidenceScores(runId: string): Promise<ConfidenceScore[]> {
    const { data, error } = await supabase
      .from('ai_confidence_scores')
      .select('*')
      .eq('run_id', runId)
      .order('score');

    if (error) throw new Error(error.message);
    return (data || []) as ConfidenceScore[];
  }
}
