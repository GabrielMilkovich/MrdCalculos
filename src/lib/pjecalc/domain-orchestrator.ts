/**
 * =====================================================
 * DOMAIN ORCHESTRATOR V3
 * =====================================================
 * 
 * Connects the domain layer (timeline, title resolver, incidence engine,
 * rubric classifier) to the verba module system and produces a fully
 * auditable CalculationItem[] per competência.
 */

import Decimal from 'decimal.js';
import type {
  LaborCase, EmploymentContract, CalculationScenario, CalculationItem,
  CalculationCompetency, JudicialTitleVersion, JudicialRule,
  InconsistencyFlag, UUID, Competencia, AuditTrailEntry,
  GlobalCalculationParams,
} from '../../domain/types';
import { buildTimeline } from '../../domain/timeline-builder';
import { resolveJudicialTitle, type ResolvedTitleState } from '../../domain/judicial-title-resolver';
import type { VerbaModuleContext } from './verba-modules/types';
import { getModulesInOrder } from './verba-modules/types';
import type { PjeVerba, PjeHistoricoSalarial, PjeCartaoPonto, PjeFalta, PjeFerias, PjeOcorrenciaResult } from './engine-types';

// =====================================================
// ORCHESTRATOR CONFIG
// =====================================================

export interface OrchestratorConfig {
  laborCase: LaborCase;
  contract: EmploymentContract;
  scenario: CalculationScenario;
  titleVersions: JudicialTitleVersion[];
  verbas: PjeVerba[];
  historicos: PjeHistoricoSalarial[];
  cartaoPonto: PjeCartaoPonto[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
}

// =====================================================
// ORCHESTRATOR RESULT
// =====================================================

export interface OrchestratorResult {
  items: CalculationItem[];
  inconsistencies: InconsistencyFlag[];
  consolidatedTitle: ResolvedTitleState;
  timeline: CalculationCompetency[];
  totalBruto: Decimal;
  totalLiquido: Decimal;
  auditSummary: AuditTrailEntry[];
}

// =====================================================
// MAIN ORCHESTRATION
// =====================================================

export function orchestrateCalculation(config: OrchestratorConfig): OrchestratorResult {
  const inconsistencies: InconsistencyFlag[] = [];
  const allItems: CalculationItem[] = [];
  const auditSummary: AuditTrailEntry[] = [];

  // Step 1: Resolve judicial title
  const consolidatedTitle = resolveJudicialTitle(config.titleVersions);
  auditSummary.push({
    campo: 'titulo_executivo',
    valor: `${consolidatedTitle.global_rules.length + Array.from(consolidatedTitle.rules_by_rubric.values()).flat().length} regras consolidadas`,
    fonte: 'judicial_title_resolver',
  });

  // Step 2: Build timeline
  const timeline = buildTimeline({
    contract: config.contract,
    calendarRules: [],
    normativeRules: [],
    evidenceSources: config.laborCase.documents || [],
    sabadoDiaUtil: config.scenario.params.sabado_dia_util,
    considerarFeriadoEstadual: config.scenario.params.considerar_feriado_estadual,
    considerarFeriadoMunicipal: config.scenario.params.considerar_feriado_municipal,
  });
  auditSummary.push({
    campo: 'timeline',
    valor: `${timeline.length} competências`,
    fonte: 'timeline_builder',
  });

  // Step 3: For each competência, run verba modules
  const modules = getModulesInOrder();
  const globalResults = new Map<string, PjeOcorrenciaResult[]>();

  for (const comp of timeline) {
    if (!comp.vinculo_ativo) continue;

    const moduleContext = buildModuleContext(config, comp, globalResults);

    for (const mod of modules) {
      const applicableVerbas = config.verbas.filter(v => {
        const isInPeriod = isVerbaInCompetencia(v, comp.competencia);
        return isInPeriod && mod.canApply(moduleContext, v);
      });

      // Check title denials
      const titleRule = findTitleRule(consolidatedTitle, mod.id, comp.competencia);

      for (const verba of applicableVerbas) {
        try {
          const inputs = mod.resolveInputs(moduleContext, verba);
          const resultado = mod.applyFormula(inputs, verba);
          const audit = mod.buildAuditTrail(moduleContext, inputs, resultado);

          const item: CalculationItem = {
            id: crypto.randomUUID(),
            scenario_id: config.scenario.id,
            rubric_code: mod.id,
            rubric_name: verba.nome,
            competencia: comp.competencia,
            base: new Decimal(inputs.base),
            base_source: inputs.baseSource,
            divisor: new Decimal(inputs.divisor),
            divisor_source: inputs.divisorSource,
            multiplicador: new Decimal(inputs.multiplicador),
            quantidade: new Decimal(inputs.quantidade),
            quantidade_source: inputs.quantidadeSource,
            dobra: new Decimal(1),
            valor_devido: new Decimal(resultado),
            valor_pago: new Decimal(0),
            diferenca: new Decimal(resultado),
            correcao: new Decimal(0),
            juros: new Decimal(0),
            total: new Decimal(resultado),
            formula_aplicada: `${mod.nome}: base=${inputs.base}/div=${inputs.divisor}×mult=${inputs.multiplicador}×qtd=${inputs.quantidade}`,
            judicial_rule_id: titleRule?.rule.id,
            ativo: true,
            reflections: [],
            incidences: [],
            offsets: [],
            audit_trail: audit,
          };

          allItems.push(item);

          // Store for dependent modules
          if (!globalResults.has(mod.id)) globalResults.set(mod.id, []);
          globalResults.get(mod.id)!.push({
            competencia: comp.competencia,
            base: inputs.base,
            divisor: inputs.divisor,
            multiplicador: inputs.multiplicador,
            quantidade: inputs.quantidade,
            dobra: 1,
            devido: resultado,
            pago: 0,
            diferenca: resultado,
            indice_correcao: 0,
            valor_corrigido: resultado,
            juros: 0,
            valor_final: resultado,
            formula: `${mod.id}`,
          });
        } catch (err) {
          inconsistencies.push({
            id: crypto.randomUUID(),
            case_id: config.laborCase.id,
            scenario_id: config.scenario.id,
            categoria: 'base_ambigua',
            severidade: 'alerta',
            competencia: comp.competencia,
            rubric_code: mod.id,
            descricao: `Erro ao calcular ${mod.nome}: ${(err as Error).message}`,
            sugestao: 'Verifique os dados de entrada para esta competência',
            resolvido: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Step 4: Calculate totals
  let totalBruto = new Decimal(0);
  let totalLiquido = new Decimal(0);
  for (const item of allItems) {
    totalBruto = totalBruto.plus(item.diferenca);
    totalLiquido = totalLiquido.plus(item.total);
  }

  return {
    items: allItems,
    inconsistencies,
    consolidatedTitle,
    timeline,
    totalBruto,
    totalLiquido,
    auditSummary,
  };
}

// =====================================================
// HELPERS
// =====================================================

function buildModuleContext(
  config: OrchestratorConfig,
  comp: CalculationCompetency,
  resultadosAnteriores: Map<string, PjeOcorrenciaResult[]>,
): VerbaModuleContext {
  return {
    caseId: config.laborCase.id,
    competencia: comp.competencia,
    periodo: {
      inicio: config.scenario.params.data_ajuizamento,
      fim: config.scenario.params.data_liquidacao,
    },
    admissao: config.contract.admissao,
    demissao: config.contract.demissao,
    historicos: config.historicos,
    cartaoPonto: config.cartaoPonto,
    faltas: config.faltas,
    ferias: config.ferias,
    calendario: {
      diasUteis: comp.calendario.dias_uteis,
      repousos: comp.calendario.domingos,
      feriados: comp.calendario.feriados,
      diasNoMes: comp.calendario.dias_no_mes,
    },
    cargaHoraria: config.scenario.params.carga_horaria_padrao,
    sabadoDiaUtil: config.scenario.params.sabado_dia_util,
    zerarNegativo: config.scenario.params.zerar_valor_negativo,
    resultadosAnteriores,
  };
}

function isVerbaInCompetencia(verba: PjeVerba, competencia: Competencia): boolean {
  if (!verba.periodo_inicio && !verba.periodo_fim) return true;
  const compDate = competencia + '-01';
  if (verba.periodo_inicio && compDate < verba.periodo_inicio) return false;
  if (verba.periodo_fim && compDate > verba.periodo_fim) return false;
  return true;
}

function findTitleRule(
  title: ResolvedTitleState,
  moduleId: string,
  _competencia: Competencia,
) {
  const rubricRules = title.rules_by_rubric.get(moduleId);
  if (rubricRules && rubricRules.length > 0) return rubricRules[0];
  if (title.global_rules.length > 0) return title.global_rules[0];
  return undefined;
}
