/**
 * =====================================================
 * FIDELITY REPORT — Loss-awareness for PJC import/bridge
 * =====================================================
 * Tracks every piece of data that was lost, approximated,
 * or synthesized during import, conversion, or calculation.
 */

export type FidelitySeverity = 'info' | 'warning' | 'error' | 'critical';
export type FidelityCategory = 
  | 'parser_unmapped' | 'bridge_fallback' | 'bridge_data_loss'
  | 'table_missing' | 'module_unsupported' | 'calculation_blocked'
  | 'precision_mismatch' | 'structural_mismatch';

export interface FidelityEntry {
  /** Unique code for this type of issue */
  code: string;
  category: FidelityCategory;
  severity: FidelitySeverity;
  /** Technical description */
  message: string;
  /** User-friendly description */
  message_friendly: string;
  /** Which module/section was affected */
  module: string;
  /** Which XML block or field was affected */
  field?: string;
  /** Estimated financial impact (R$) */
  impact_estimated?: number;
  /** Recommended action */
  action?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface FidelityReport {
  /** Total entries */
  total_entries: number;
  /** Entries by severity */
  by_severity: Record<FidelitySeverity, number>;
  /** Entries by category */
  by_category: Record<string, number>;
  /** All entries */
  entries: FidelityEntry[];
  /** Whether calculation should be blocked */
  calculation_blocked: boolean;
  /** Reasons for blocking */
  blocking_reasons: string[];
  /** Whether synthetic fallbacks were used */
  synthetic_fallbacks_used: boolean;
  /** Timestamp */
  created_at: string;
}

export function createFidelityReport(): FidelityReport {
  return {
    total_entries: 0,
    by_severity: { info: 0, warning: 0, error: 0, critical: 0 },
    by_category: {},
    entries: [],
    calculation_blocked: false,
    blocking_reasons: [],
    synthetic_fallbacks_used: false,
    created_at: new Date().toISOString(),
  };
}

export function addFidelityEntry(report: FidelityReport, entry: FidelityEntry): void {
  report.entries.push(entry);
  report.total_entries++;
  report.by_severity[entry.severity]++;
  report.by_category[entry.category] = (report.by_category[entry.category] || 0) + 1;
  
  if (entry.severity === 'critical') {
    report.calculation_blocked = true;
    report.blocking_reasons.push(entry.message);
  }
  if (entry.category === 'bridge_fallback') {
    report.synthetic_fallbacks_used = true;
  }
}

/**
 * Structured error for calculation blocking
 */
export interface CalculationBlockError {
  type: 'table_missing' | 'param_missing' | 'structural_error' | 'data_integrity';
  code: string;
  message: string;
  message_friendly: string;
  severity: 'error' | 'critical';
  /** Affected competências */
  competencias_afetadas?: string[];
  /** Missing table name */
  tabela_ausente?: string;
  /** Recommended action */
  acao_recomendada: string;
}

/**
 * Structured warning for non-blocking issues
 */
export interface CalculationWarning {
  type: 'fallback_used' | 'precision_loss' | 'module_partial' | 'data_approximated';
  code: string;
  message: string;
  message_friendly: string;
  severity: 'info' | 'warning';
  module: string;
  impact_description?: string;
}

/**
 * Parity report comparing engine result vs PJC ground truth
 */
export interface ParityReportEntry {
  competencia: string;
  campo: string;
  valor_engine: number;
  valor_pjc: number;
  diferenca_absoluta: number;
  diferenca_percentual: number;
  tolerancia_ok: boolean;
}

export interface ParityReport {
  caso: string;
  engine_version: string;
  pjc_version: string;
  data_comparacao: string;
  
  /** Summary totals */
  totais: {
    principal_bruto: { engine: number; pjc: number; delta: number; delta_pct: number };
    liquido_exequente: { engine: number; pjc: number; delta: number; delta_pct: number };
    inss_reclamante: { engine: number; pjc: number; delta: number; delta_pct: number };
    inss_reclamado: { engine: number; pjc: number; delta: number; delta_pct: number };
    imposto_renda: { engine: number; pjc: number; delta: number; delta_pct: number };
    fgts: { engine: number; pjc: number; delta: number; delta_pct: number };
    honorarios: { engine: number; pjc: number; delta: number; delta_pct: number };
    custas: { engine: number; pjc: number; delta: number; delta_pct: number };
  };
  
  /** Per-competência comparison (from ApuracaoDeJuros) */
  por_competencia: ParityReportEntry[];
  
  /** Overall parity score (0-100) */
  score: number;
  
  /** Entries outside tolerance */
  divergencias: ParityReportEntry[];
  
  /** Tolerance policy */
  tolerancia: {
    monetaria_absoluta: number;  // R$ tolerance
    percentual_maximo: number;   // % tolerance
    justificativa: string;
  };
}

/**
 * Audit trail entry for a single calculation step
 */
export interface AuditTrailEntry {
  step: number;
  module: string;
  rubrica?: string;
  competencia?: string;
  description: string;
  
  /** Input sources */
  fonte_insumo: string;
  tabela_historica?: string;
  regra_aplicada?: string;
  
  /** Calculation details */
  base_calculo?: number;
  divisor?: number;
  multiplicador?: number;
  quantidade?: number;
  resultado?: number;
  
  /** Incidences */
  incidencias?: string[];
  reflexos_gerados?: string[];
  arredondamento?: string;
  desconto_pago?: number;
  
  /** Warnings */
  fallback_acionado?: boolean;
  warning_fidelidade?: string;
  modulo_nao_suportado?: string;
  divergencia_pjc?: number;
}

export interface AuditTrail {
  case_id: string;
  engine_version: string;
  execution_timestamp: string;
  total_steps: number;
  entries: AuditTrailEntry[];
  fidelity_report: FidelityReport;
  parity_report?: ParityReport;
}
