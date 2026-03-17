/**
 * =====================================================
 * JUDICIAL TITLE RESOLVER — Resolvedor de Título Executivo
 * =====================================================
 * 
 * Consolida regras de sentença, acórdão, embargos e retificações.
 * Produz a regra final vigente por verba, período e cenário.
 * 
 * Hierarquia: última versão consolidada > regras anteriores > dados documentais
 */

import type {
  JudicialTitleVersion, JudicialRule, UUID, DateStr, Competencia,
} from './types';

// =====================================================
// RESOLVED RULE — Regra final vigente
// =====================================================

export interface ResolvedJudicialRule {
  rule: JudicialRule;
  source_version: JudicialTitleVersion;
  /** Whether a later decision overrode a previous rule */
  overridden_rules: JudicialRule[];
  /** Effective priority after conflict resolution */
  effective_priority: number;
}

export interface ResolvedTitleState {
  /** All rules resolved, organized by rubric */
  rules_by_rubric: Map<string, ResolvedJudicialRule[]>;
  /** Global rules (no specific rubric) */
  global_rules: ResolvedJudicialRule[];
  /** Rubrics that were explicitly denied */
  denied_rubrics: Set<string>;
  /** Rubrics that were explicitly granted */
  granted_rubrics: Set<string>;
  /** Conflicts detected during resolution */
  conflicts: TitleConflict[];
  /** The most recent title version */
  latest_version: JudicialTitleVersion | null;
}

export interface TitleConflict {
  rubric_code?: string;
  rule_a: JudicialRule;
  rule_b: JudicialRule;
  resolution: 'posterior_prevalece' | 'manual_required';
  description: string;
}

// =====================================================
// RESOLVER
// =====================================================

/**
 * Resolve the final judicial title state from all versions.
 * 
 * The resolver follows these principles:
 * 1. Later decisions (higher version number) override earlier ones
 * 2. Within the same version, higher priority rules prevail
 * 3. Explicit denials (indeferimento) block any prior grants
 * 4. Parameter rules are merged (later values override earlier ones)
 * 5. Conflicts are recorded for human review
 */
export function resolveJudicialTitle(
  versions: JudicialTitleVersion[],
): ResolvedTitleState {
  // Sort by version (ascending), then by decision date
  const sorted = [...versions].sort((a, b) => {
    if (a.versao !== b.versao) return a.versao - b.versao;
    return a.data_decisao.localeCompare(b.data_decisao);
  });
  
  const state: ResolvedTitleState = {
    rules_by_rubric: new Map(),
    global_rules: [],
    denied_rubrics: new Set(),
    granted_rubrics: new Set(),
    conflicts: [],
    latest_version: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  };
  
  // Process each version in order
  for (const version of sorted) {
    for (const rule of version.rules) {
      processRule(state, rule, version, sorted);
    }
  }
  
  return state;
}

function processRule(
  state: ResolvedTitleState,
  rule: JudicialRule,
  version: JudicialTitleVersion,
  allVersions: JudicialTitleVersion[],
): void {
  const resolved: ResolvedJudicialRule = {
    rule,
    source_version: version,
    overridden_rules: [],
    effective_priority: rule.prioridade + version.versao * 1000,
  };
  
  // Handle denials
  if (rule.tipo === 'indeferimento' && rule.rubric_code) {
    state.denied_rubrics.add(rule.rubric_code);
    state.granted_rubrics.delete(rule.rubric_code);
    // Remove existing rules for this rubric
    state.rules_by_rubric.delete(rule.rubric_code);
  }
  
  // Handle grants
  if (rule.tipo === 'deferimento' && rule.rubric_code) {
    if (state.denied_rubrics.has(rule.rubric_code)) {
      // A later version re-grants what was denied — the later decision prevails
      state.denied_rubrics.delete(rule.rubric_code);
    }
    state.granted_rubrics.add(rule.rubric_code);
  }
  
  // Skip if rubric is denied (and this isn't the denial itself)
  if (rule.rubric_code && state.denied_rubrics.has(rule.rubric_code) && rule.tipo !== 'indeferimento') {
    return;
  }
  
  // Place rule
  if (rule.rubric_code) {
    const existing = state.rules_by_rubric.get(rule.rubric_code) || [];
    
    // Check for conflicts with existing rules
    const conflicting = existing.filter(e => 
      e.rule.tipo === rule.tipo &&
      periodsOverlap(e.rule.periodo_inicio, e.rule.periodo_fim, rule.periodo_inicio, rule.periodo_fim)
    );
    
    for (const conflict of conflicting) {
      if (resolved.effective_priority > conflict.effective_priority) {
        resolved.overridden_rules.push(conflict.rule);
        state.conflicts.push({
          rubric_code: rule.rubric_code,
          rule_a: conflict.rule,
          rule_b: rule,
          resolution: 'posterior_prevalece',
          description: `Regra da ${version.tipo} (v${version.versao}) prevalece sobre ${conflict.source_version.tipo} (v${conflict.source_version.versao})`,
        });
        // Remove overridden
        const idx = existing.indexOf(conflict);
        if (idx >= 0) existing.splice(idx, 1);
      }
    }
    
    existing.push(resolved);
    state.rules_by_rubric.set(rule.rubric_code, existing);
  } else {
    // Global rule
    const conflicting = state.global_rules.filter(e => 
      e.rule.tipo === rule.tipo &&
      e.rule.descricao === rule.descricao
    );
    
    for (const conflict of conflicting) {
      if (resolved.effective_priority > conflict.effective_priority) {
        resolved.overridden_rules.push(conflict.rule);
        const idx = state.global_rules.indexOf(conflict);
        if (idx >= 0) state.global_rules.splice(idx, 1);
      }
    }
    
    state.global_rules.push(resolved);
  }
}

function periodsOverlap(
  start1?: DateStr, end1?: DateStr,
  start2?: DateStr, end2?: DateStr,
): boolean {
  // If either has no period defined, they are global and always overlap
  if (!start1 || !start2) return true;
  
  const s1 = start1;
  const e1 = end1 || '9999-12-31';
  const s2 = start2;
  const e2 = end2 || '9999-12-31';
  
  return s1 <= e2 && s2 <= e1;
}

// =====================================================
// QUERY HELPERS
// =====================================================

/**
 * Get the effective rules for a specific rubric in a specific competência.
 */
export function getRulesForRubric(
  state: ResolvedTitleState,
  rubricCode: string,
  competencia?: Competencia,
): ResolvedJudicialRule[] {
  if (state.denied_rubrics.has(rubricCode)) return [];
  
  const rules = state.rules_by_rubric.get(rubricCode) || [];
  
  if (!competencia) return rules;
  
  // Filter by period
  const compDate = competencia + '-15'; // mid-month approximation
  return rules.filter(r => {
    if (!r.rule.periodo_inicio) return true; // global
    const end = r.rule.periodo_fim || '9999-12-31';
    return r.rule.periodo_inicio <= compDate && end >= compDate;
  });
}

/**
 * Check if a rubric is granted in the consolidated title.
 */
export function isRubricGranted(state: ResolvedTitleState, rubricCode: string): boolean {
  return state.granted_rubrics.has(rubricCode) && !state.denied_rubrics.has(rubricCode);
}

/**
 * Get parameter rules that affect calculation behavior globally.
 */
export function getParameterOverrides(
  state: ResolvedTitleState,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  for (const resolved of state.global_rules) {
    if (resolved.rule.tipo === 'parametro') {
      Object.assign(params, resolved.rule.parametros);
    }
  }
  
  return params;
}
