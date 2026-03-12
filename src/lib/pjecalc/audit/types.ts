/**
 * =====================================================
 * AI AUDIT AGENT — TYPES
 * =====================================================
 */

export type AuditRunType = 'pre_calculo' | 'pos_calculo' | 'reconciliacao' | 'rubric_mapping' | 'jornada_audit' | 'monetary_audit' | 'full';

export type AuditOverallStatus = 'APTO' | 'APTO_COM_WARNINGS' | 'BAIXA_CONFIABILIDADE' | 'BLOQUEADO' | 'DIVERGENTE_DO_PJE';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingType = 'blocker' | 'warning' | 'info' | 'conflict' | 'suggestion';

export interface AuditRun {
  id: string;
  case_id: string;
  calculo_id: string | null;
  run_type: AuditRunType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  overall_confidence: number;
  overall_status: AuditOverallStatus | null;
  model_used: string | null;
  prompt_version: string | null;
  execution_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditFinding {
  id: string;
  run_id: string;
  agent_name: string;
  finding_type: FindingType;
  severity: FindingSeverity;
  module: string;
  field: string | null;
  code: string;
  title: string;
  technical_message: string;
  user_message: string;
  recommended_action: string | null;
  confidence: number;
  source_basis: string | null;
  requires_human_confirmation: boolean;
  resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface ConfidenceScore {
  id: string;
  run_id: string;
  module: string;
  label: string;
  score: number;
  field_count: number;
  resolved_count: number;
  inferred_count: number;
  absent_count: number;
  blocker_count: number;
}

export interface ReconciliationReport {
  id: string;
  run_id: string;
  case_id: string;
  mrd_total_bruto: number | null;
  mrd_total_liquido: number | null;
  pje_total_bruto: number | null;
  pje_total_liquido: number | null;
  delta_bruto: number | null;
  delta_liquido: number | null;
  delta_percentual: number | null;
  parameter_divergences: any[];
  rubric_divergences: any[];
  closure_divergences: any[];
  root_causes: any[];
  overall_assessment: string | null;
}

export interface AuditRunSummary {
  run_id: string;
  status: AuditOverallStatus;
  confidence: number;
  findings_count: number;
  blockers: number;
  warnings: number;
  execution_time_ms: number;
  agents_run: string[];
}

export interface AuditRunDetail extends AuditRun {
  findings: AuditFinding[];
  scores: ConfidenceScore[];
  reconciliation: ReconciliationReport | null;
}

// Status badge config
export const AUDIT_STATUS_CONFIG: Record<AuditOverallStatus, { label: string; color: string; icon: string }> = {
  APTO: { label: 'Apto', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: 'check-circle' },
  APTO_COM_WARNINGS: { label: 'Apto c/ Alertas', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: 'alert-triangle' },
  BAIXA_CONFIABILIDADE: { label: 'Baixa Confiabilidade', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: 'alert-circle' },
  BLOQUEADO: { label: 'Bloqueado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: 'x-circle' },
  DIVERGENTE_DO_PJE: { label: 'Divergente do PJe', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: 'git-compare' },
};

export const SEVERITY_CONFIG: Record<FindingSeverity, { label: string; color: string; priority: number }> = {
  critical: { label: 'Crítico', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', priority: 5 },
  high: { label: 'Alto', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', priority: 4 },
  medium: { label: 'Médio', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', priority: 3 },
  low: { label: 'Baixo', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', priority: 2 },
  info: { label: 'Info', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20', priority: 1 },
};
