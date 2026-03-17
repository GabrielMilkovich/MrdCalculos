/**
 * =====================================================
 * DOMAIN ORCHESTRATOR V3
 * =====================================================
 * 
 * Connects the domain layer (timeline, title resolver, incidence engine,
 * rubric classifier) to the verba module system and produces a fully
 * auditable CalculationItem[] per competência.
 * 
 * Pipeline:
 *   1. Resolve Judicial Title → consolidated rules per rubric
 *   2. Build Timeline → monthly competências with contract state
 *   3. For each competência, run applicable VerbaModules
 *   4. Apply reflections → generate dependent items
 *   5. Apply incidences (FGTS, INSS, IRRF)
 *   6. Apply offsets
 *   7. Produce audit trail
 */

import Decimal from 'decimal.js';
import type {
  LaborCase, EmploymentContract, CalculationScenario, CalculationItem,
  CalculationCompetency, JudicialTitleVersion, JudicialRule,
  InconsistencyFlag, UUID, Competencia, AuditTrailEntry,
  CalculationItemReflection, CalculationItemIncidence, CalculationItemOffset,
} from '../../domain/types';
import { buildTimeline } from '../../domain/timeline-builder';
import { resolveJudicialTitle, type ConsolidatedTitle } from '../../domain/judicial-title-resolver';
import { calcularFGTS, calcularINSS, calcularIRRF, type FGTSConfig, type INSSTabela, type IRRFTabela } from '../../domain/incidence-engine';
import { getModulesInOrder, type VerbaModuleContext, type VerbaModule } from '../verba-modules';
import type { PjeVerba, PjeHistoricoSalarial, PjeCartaoPonto, PjeFalta, PjeFerias, PjeOcorrenciaResult } from '../engine-types';

// =====================================================
// ORCHESTRATOR CONFIG
// =====================================================

export interface OrchestratorConfig {
  laborCase: LaborCase;
  contract: EmploymentContract;
  scenario: CalculationScenario;
  titleVersions: JudicialTitleVersion[];
  /** Engine-level verba definitions */
  verbas: PjeVerba[];
  historicos: PjeHistoricoSalarial[];
  cartaoPonto: PjeCartaoPonto[];
  faltas: PjeFalta[];
  ferias: PjeFerias[];
  /** Tax tables for incidence calculation */
  inssTabelas?: INSSTabela[];
  irrfTabelas?: IRRFTabela[];
  fgtsConfig?: FGTSConfig;
}

// =====================================================
// ORCHESTRATOR RESULT
// =====================================================

export interface OrchestratorResult {
  items: CalculationItem[];
  inconsistencies: InconsistencyFlag[];
  consolidatedTitle: ConsolidatedTitle;
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
    valor: `${consolidatedTitle.rules.length} regras consolidadas`,
    fonte: 'judicial_title_resolver',
  });

  // Step 2: Build timeline
  const timeline = buildTimeline(
    config.contract,
    config.scenario.params,
    config.laborCase.documents,
  );
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
      // Check if module has applicable verbas
      const applicableVerbas = config.verbas.filter(v => {
        const isInPeriod = isVerbaInCompetencia(v, comp.competencia);
        return isInPeriod && mod.canApply(moduleContext, v);
      });

      // Check if module should be skipped by judicial title
      const titleRule = findTitleRule(consolidatedTitle, mod.id, comp.competencia);
      if (titleRule?.tipo === 'indeferimento') continue;

      for (const verba of applicableVerbas) {
        try {
          const inputs = mod.resolveInputs(moduleContext, verba);
          const resultado = mod.applyFormula(inputs, verba);
          const reflections = mod.getReflections(verba);
          const incidences = mod.getIncidences(verba);
          const audit = mod.buildAuditTrail(moduleContext, inputs, resultado);

          const item = buildCalculationItem(
            config.scenario.id,
            mod, verba, comp.competencia,
            inputs, resultado, reflections, incidences, audit,
            titleRule,
          );

          allItems.push(item);

          // Store results for dependent modules
          const key = mod.id;
          if (!globalResults.has(key)) globalResults.set(key, []);
          globalResults.get(key)!.push({
            verba_id: verba.id,
            verba_nome: verba.nome,
            competencia: comp.competencia,
            base_valor: inputs.base,
            multiplicador: inputs.multiplicador,
            divisor: inputs.divisor,
            quantidade: inputs.quantidade,
            dobra: 1,
            devido: resultado,
            pago: 0,
            diferenca: resultado,
            correcao: 0,
            juros: 0,
            total: resultado,
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
  title: ConsolidatedTitle,
  moduleId: string,
  competencia: Competencia,
): JudicialRule | undefined {
  return title.rules.find(r => {
    if (r.rubric_code && r.rubric_code !== moduleId) return false;
    if (r.periodo_inicio && competencia < r.periodo_inicio.slice(0, 7)) return false;
    if (r.periodo_fim && competencia > r.periodo_fim.slice(0, 7)) return false;
    return true;
  });
}

function buildCalculationItem(
  scenarioId: UUID,
  mod: VerbaModule,
  verba: PjeVerba,
  competencia: Competencia,
  inputs: { base: number; baseSource: string; divisor: number; divisorSource: string; multiplicador: number; quantidade: number; quantidadeSource: string },
  resultado: number,
  _reflections: unknown[],
  _incidences: unknown,
  audit: { campo: string; valor: string | number; fonte: string; regra?: string; observacao?: string }[],
  titleRule?: JudicialRule,
): CalculationItem {
  return {
    id: crypto.randomUUID(),
    scenario_id: scenarioId,
    rubric_code: mod.id,
    rubric_name: verba.nome,
    competencia,
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
    judicial_rule_id: titleRule?.id,
    ativo: true,
    reflections: [],
    incidences: [],
    offsets: [],
    audit_trail: audit.map(a => ({
      campo: a.campo,
      valor: a.valor,
      fonte: a.fonte,
      regra: a.regra,
      observacao: a.observacao,
    })),
  };
}
