/**
 * =====================================================
 * VERBA MODULE SYSTEM — INTERFACE DE MÓDULOS PLUG-IN
 * =====================================================
 *
 * STATUS: NÃO INTEGRADO AO FLUXO DE PRODUÇÃO.
 *
 * O PjeCalcEngine (engine.ts) usa uma fórmula genérica parametrizada
 * pela configuração da PjeVerba, e NÃO chama estes módulos.
 * Estes módulos são usados apenas pelo domain-orchestrator.ts (V3,
 * não o orchestrador de produção) e por testes unitários.
 *
 * Para que regras de negócio específicas de cada verba cheguem ao
 * cálculo real, elas devem ser configuradas via PjeVerba (multiplicador,
 * divisor, tipo_quantidade, incidências, etc.) — NÃO por este sistema.
 *
 * Mantido como referência de lógica jurídica e para testes.
 */

import type { PjeVerba, PjeOcorrenciaResult, PjeHistoricoSalarial, PjeCartaoPonto, PjeFalta, PjeFerias } from '../engine-types';

// =====================================================
// CONTEXT - O que o módulo recebe para decidir
// =====================================================

export interface VerbaModuleContext {
  /** Case ID */
  caseId: string;
  /** Competência being calculated (YYYY-MM) */
  competencia: string;
  /** Full calculation period */
  periodo: { inicio: string; fim: string };
  /** Contract dates */
  admissao: string;
  demissao?: string;
  /** Salary histories available */
  historicos: PjeHistoricoSalarial[];
  /** Timecard data */
  cartaoPonto: PjeCartaoPonto[];
  /** Absences */
  faltas: PjeFalta[];
  /** Vacations */
  ferias: PjeFerias[];
  /** Calendar info for this competência */
  calendario: {
    diasUteis: number;
    repousos: number;
    feriados: number;
    diasNoMes: number;
  };
  /** Carga horária for this competência */
  cargaHoraria: number;
  /** Global params */
  sabadoDiaUtil: boolean;
  zerarNegativo: boolean;
  /** Results of previously calculated verbas (for reflexas) */
  resultadosAnteriores: Map<string, PjeOcorrenciaResult[]>;
}

// =====================================================
// RESOLVED INPUTS - O que o módulo extraiu do contexto
// =====================================================

export interface ResolvedInputs {
  base: number;
  baseSource: string;
  quantidade: number;
  quantidadeSource: string;
  divisor: number;
  divisorSource: string;
  multiplicador: number;
  /** Additional metadata about input resolution */
  metadata?: Record<string, unknown>;
}

// =====================================================
// REFLECTION SPEC - Reflexo gerado por um módulo
// =====================================================

export interface ReflectionSpec {
  targetVerba: string;
  tipo: '13_salario' | 'ferias' | 'aviso_previo' | 'fgts' | 'dsr';
  baseMultiplier: number;
  divisor: number;
  periodoMedia?: 'ano_civil' | 'periodo_aquisitivo' | '12_meses';
}

// =====================================================
// INCIDENCE SPEC - Incidências declaradas
// =====================================================

export interface IncidenceSpec {
  fgts: boolean;
  inss: boolean;
  irrf: boolean;
  natureza: 'salarial' | 'indenizatoria';
}

// =====================================================
// AUDIT ENTRY - Trilha gerada pelo módulo
// =====================================================

export interface ModuleAuditEntry {
  campo: string;
  valor: string | number;
  fonte: string;
  regra?: string;
  observacao?: string;
}

// =====================================================
// VERBA MODULE — Interface principal
// =====================================================

export interface VerbaModule {
  /** Unique module identifier */
  readonly id: string;
  /** Display name */
  readonly nome: string;
  /** Module family */
  readonly familia: 'jornada' | 'variavel' | 'contratual' | 'rescisoria' | 'reflexo' | 'tributario';
  /** Dependencies (IDs of modules that must run before) */
  readonly dependencias: string[];

  /** Can this module apply to the given context? */
  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean;

  /** Resolve all inputs from context */
  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs;

  /** Apply the calculation formula */
  applyFormula(inputs: ResolvedInputs, verba: PjeVerba): number;

  /** Declare which reflections this verba generates */
  getReflections(verba: PjeVerba): ReflectionSpec[];

  /** Declare incidence rules */
  getIncidences(verba: PjeVerba): IncidenceSpec;

  /** Build audit trail entries */
  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[];
}

// =====================================================
// MODULE REGISTRY
// =====================================================

const moduleRegistry = new Map<string, VerbaModule>();

export function registerVerbaModule(mod: VerbaModule): void {
  moduleRegistry.set(mod.id, mod);
}

export function getVerbaModule(id: string): VerbaModule | undefined {
  return moduleRegistry.get(id);
}

export function getAllVerbaModules(): VerbaModule[] {
  return Array.from(moduleRegistry.values());
}

/**
 * Get modules in topological order (respecting dependencies).
 */
export function getModulesInOrder(): VerbaModule[] {
  const all = getAllVerbaModules();
  const visited = new Set<string>();
  const result: VerbaModule[] = [];

  function visit(mod: VerbaModule) {
    if (visited.has(mod.id)) return;
    visited.add(mod.id);
    for (const depId of mod.dependencias) {
      const dep = moduleRegistry.get(depId);
      if (dep) visit(dep);
    }
    result.push(mod);
  }

  for (const mod of all) visit(mod);
  return result;
}
