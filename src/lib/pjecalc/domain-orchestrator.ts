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
  CalculationCompetency, JudicialTitleVersion,
  InconsistencyFlag, Competencia, AuditTrailEntry, ReflectionRuleConfig,
} from '../../domain/types';
import { buildTimeline } from '../../domain/timeline-builder';
import { resolveJudicialTitle, type ResolvedTitleState } from '../../domain/judicial-title-resolver';
import { generateReflections, reflectionResultToItemReflection, type ReflectionContext } from '../../domain/reflection-engine';
import type { VerbaModuleContext, ReflectionSpec, VerbaModule } from './verba-modules/types';
import { getModulesInOrder } from './verba-modules/types';
import type { PjeVerba, PjeHistoricoSalarial, PjeCartaoPonto, PjeFalta, PjeFerias, PjeOcorrenciaResult } from './engine-types';
import type { PjecalcLiquidacaoResultadoRow, PjecalcOcorrenciaRow } from './types';

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
  ocorrencias?: PjecalcOcorrenciaRow[];
  resultadoFinanceiro?: PjecalcLiquidacaoResultadoRow | null;
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

type AggregatedOccurrence = Pick<
  CalculationItem,
  'valor_devido' | 'valor_pago' | 'diferenca' | 'correcao' | 'juros' | 'total'
>;

type ExecutedItem = {
  item: CalculationItem;
  verba: PjeVerba;
  module: VerbaModule;
  reflectionRules: ReflectionRuleConfig[];
};

const CLOSING_COMPETENCIA = 'fechamento';

// =====================================================
// MAIN ORCHESTRATION
// =====================================================

export function orchestrateCalculation(config: OrchestratorConfig): OrchestratorResult {
  const inconsistencies: InconsistencyFlag[] = [];
  const allItems: CalculationItem[] = [];
  const executedItems: ExecutedItem[] = [];
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
      const applicableVerbas = config.verbas.filter((verba) => {
        const isInPeriod = isVerbaInCompetencia(verba, comp.competencia);
        return isInPeriod && isModuleVerbaMatch(mod.id, verba) && mod.canApply(moduleContext, verba);
      });

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
          executedItems.push({
            item,
            verba,
            module: mod,
            reflectionRules: buildReflectionRules(mod, verba),
          });

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

  let items = allItems;

  const materializedReflections = materializeReflectionItems(
    config.scenario.id,
    config.contract,
    executedItems,
    auditSummary,
  );

  if (materializedReflections.length > 0) {
    items = [...items, ...materializedReflections];
  }

  if (config.ocorrencias?.length) {
    items = mergePersistedOccurrenceClosure(items, config.ocorrencias, auditSummary);
  }

  if (config.resultadoFinanceiro) {
    const closingItems = buildFinancialClosingItems(config.scenario.id, config.resultadoFinanceiro);
    if (closingItems.length > 0) {
      items = [...items, ...closingItems];
      auditSummary.push({
        campo: 'fechamento_financeiro',
        valor: `${closingItems.length} lançamentos sintéticos de fechamento`,
        fonte: 'domain_financial_bridge',
      });
    }
  }

  // Step 4: Calculate totals
  let totalBruto = new Decimal(0);
  let totalLiquido = new Decimal(0);
  for (const item of items) {
    totalBruto = totalBruto.plus(item.diferenca);
    totalLiquido = totalLiquido.plus(item.total);
  }

  return {
    items,
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

function normalizeCompetencia(value?: string | null): string {
  if (!value) return '';
  return value.length >= 7 ? value.slice(0, 7) : value;
}

function normalizeText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
}

function includesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function isModuleVerbaMatch(moduleId: string, verba: PjeVerba): boolean {
  const name = normalizeText(verba.nome);
  const isOvertime = includesAny(name, ['HORA EXTRA', 'HORAS EXTRAS', 'HE 50', 'HE 100', 'EXTRA 50', 'EXTRA 100']);

  switch (moduleId) {
    case 'HE_50':
      return isOvertime && includesAny(name, ['50', 'CINQUENTA']) && !includesAny(name, ['100', 'CEM']);
    case 'HE_100':
      return isOvertime && includesAny(name, ['100', 'CEM']);
    case 'INTRAJORNADA':
      return name.includes('INTRAJORNADA') || (name.includes('INTERVALO') && name.includes('SUPRIM'));
    case 'INTERJORNADA':
      return name.includes('INTERJORNADA');
    case 'ART384':
      return name.includes('384') || name.includes('INTERVALO MULHER');
    case 'DOM_FER':
      return includesAny(name, ['DOMINGO', 'FERIADO', 'DOM FER']);
    case 'COMISSAO':
      return name.includes('COMISS');
    case 'PREMIO':
      return includesAny(name, ['PREMIO', 'META', 'BONIF']);
    case 'DSR':
      return includesAny(name, ['DSR', 'RSR', 'DESCANSO SEMANAL']);
    case 'SAL_SUBST':
      return includesAny(name, ['SUBSTITUI', 'EQUIPARA']);
    case 'PLR_PROP':
      return includesAny(name, ['PLR', 'PARTICIPA']);
    case 'SALDO_SAL':
      return includesAny(name, ['SALDO SALARIO', 'SALDO DE SALARIO']);
    case 'AVISO_PREVIO':
      return includesAny(name, ['AVISO PREVIO', 'AVISO']);
    case 'FERIAS_VENC':
      return name.includes('FERIAS') && includesAny(name, ['VENC', 'DOBRA']);
    case 'FERIAS_PROP':
      return name.includes('FERIAS') && name.includes('PROP');
    case 'DECIMO_PROP':
      return includesAny(name, ['13 SALARIO', '13O SALARIO', 'DECIMO TERCEIRO', 'DECIMO 3']);
    case 'FGTS_DIF':
      return name.includes('FGTS') && !includesAny(name, ['MULTA 40', '40 FGTS']);
    case 'MULTA_40_FGTS':
      return name.includes('FGTS') && includesAny(name, ['MULTA', '40']);
    case 'MULTA_467':
      return name.includes('467');
    case 'MULTA_477':
      return name.includes('477');
    default:
      return false;
  }
}

function buildOccurrenceAggregation(rows: PjecalcOcorrenciaRow[]): Map<string, AggregatedOccurrence> {
  const map = new Map<string, AggregatedOccurrence>();

  for (const row of rows) {
    const rubricName = row.verba_nome || row.verba_id;
    const key = `${rubricName}::${normalizeCompetencia(row.competencia)}`;
    const current = map.get(key) || {
      valor_devido: new Decimal(0),
      valor_pago: new Decimal(0),
      diferenca: new Decimal(0),
      correcao: new Decimal(0),
      juros: new Decimal(0),
      total: new Decimal(0),
    };

    current.valor_devido = current.valor_devido.plus(row.devido || 0);
    current.valor_pago = current.valor_pago.plus(row.pago || 0);
    current.diferenca = current.diferenca.plus(row.diferenca || 0);
    current.correcao = current.correcao.plus(row.correcao || 0);
    current.juros = current.juros.plus(row.juros || 0);
    current.total = current.total.plus(row.total || 0);

    map.set(key, current);
  }

  return map;
}

function mergePersistedOccurrenceClosure(
  items: CalculationItem[],
  ocorrencias: PjecalcOcorrenciaRow[],
  auditSummary: AuditTrailEntry[],
): CalculationItem[] {
  const occurrenceMap = buildOccurrenceAggregation(ocorrencias);
  let matched = 0;

  const merged = items.map((item) => {
    const key = `${item.rubric_name}::${normalizeCompetencia(item.competencia)}`;
    const occurrence = occurrenceMap.get(key);

    if (!occurrence) return item;

    matched += 1;
    return {
      ...item,
      valor_devido: occurrence.valor_devido,
      valor_pago: occurrence.valor_pago,
      diferenca: occurrence.diferenca,
      correcao: occurrence.correcao,
      juros: occurrence.juros,
      total: occurrence.total,
      audit_trail: [
        ...item.audit_trail,
        {
          campo: 'fechamento_financeiro',
          valor: occurrence.total.toNumber(),
          fonte: 'pjecalc_ocorrencias',
          observacao: 'Valor consolidado com correção monetária e juros do fechamento financeiro.',
        },
      ],
    };
  });

  auditSummary.push({
    campo: 'ocorrencias_financeiras',
    valor: `${matched}/${items.length} itens reconciliados com fechamento persistido`,
    fonte: 'pjecalc_ocorrencias',
  });

  return merged;
}

function buildReflectionRules(module: VerbaModule, verba: PjeVerba): ReflectionRuleConfig[] {
  return module
    .getReflections(verba)
    .map(mapReflectionSpecToRule)
    .filter((rule): rule is ReflectionRuleConfig => Boolean(rule));
}

function mapReflectionSpecToRule(spec: ReflectionSpec): ReflectionRuleConfig | null {
  if (spec.tipo === 'dsr' || spec.tipo === 'fgts') {
    return null;
  }

  const targetRubricByType: Record<Exclude<ReflectionSpec['tipo'], 'dsr' | 'fgts'>, string> = {
    '13_salario': '13_SALARIO',
    ferias: 'FERIAS_1_3',
    aviso_previo: 'AVISO_PREVIO',
  };

  return {
    target_rubric: targetRubricByType[spec.tipo],
    tipo: spec.tipo === '13_salario' || spec.tipo === 'ferias' ? 'anual' : 'rescisorio',
    base_multiplier: spec.baseMultiplier,
    divisor: spec.divisor,
    periodo_media: spec.periodoMedia,
    usa_avos: true,
    fracao_mes: spec.tipo === 'aviso_previo' ? 'integralizar' : 'desprezar_menor_15',
  };
}

function materializeReflectionItems(
  scenarioId: string,
  contract: EmploymentContract,
  executedItems: ExecutedItem[],
  auditSummary: AuditTrailEntry[],
): CalculationItem[] {
  const groups = new Map<string, { sourceItems: CalculationItem[]; rules: ReflectionRuleConfig[] }>();

  for (const executed of executedItems) {
    if (executed.item.diferenca.lte(0) || executed.reflectionRules.length === 0) continue;

    const group = groups.get(executed.module.id) || { sourceItems: [], rules: [] };
    group.sourceItems.push(executed.item);

    for (const rule of executed.reflectionRules) {
      const exists = group.rules.some(
        (existing) =>
          existing.target_rubric === rule.target_rubric &&
          existing.tipo === rule.tipo &&
          existing.base_multiplier === rule.base_multiplier &&
          existing.divisor === rule.divisor,
      );
      if (!exists) group.rules.push(rule);
    }

    groups.set(executed.module.id, group);
  }

  const reflectionItems: CalculationItem[] = [];

  for (const [moduleId, group] of groups) {
    const reflectionContext: ReflectionContext = {
      sourceItems: group.sourceItems,
      admissao: contract.admissao,
      demissao: contract.demissao,
      vedasReflexo: [],
      zerarNegativo: true,
    };

    const results = generateReflections(reflectionContext, group.rules);

    for (const result of results) {
      const sourceItem = group.sourceItems.find((item) => item.id === result.item_id);
      if (!sourceItem) continue;

      sourceItem.reflections.push(reflectionResultToItemReflection(result));
      reflectionItems.push(createReflectionItem(scenarioId, sourceItem, result));
    }

    if (results.length > 0) {
      auditSummary.push({
        campo: `reflexos_${moduleId}`,
        valor: `${results.length} reflexos materializados`,
        fonte: 'reflection_engine',
      });
    }
  }

  return reflectionItems;
}

function createReflectionItem(
  scenarioId: string,
  sourceItem: CalculationItem,
  result: ReturnType<typeof generateReflections>[number],
): CalculationItem {
  const targetLabel = getReflectionLabel(result.target_rubric);

  return {
    id: crypto.randomUUID(),
    scenario_id: scenarioId,
    rubric_code: `REFLEXO_${result.target_rubric}`,
    rubric_name: `${targetLabel} sobre ${sourceItem.rubric_name}`,
    competencia: result.competencia_destino,
    base: result.base,
    base_source: `reflexo:${sourceItem.rubric_name}`,
    divisor: result.divisor,
    divisor_source: 'reflection_engine',
    multiplicador: result.multiplicador,
    quantidade: new Decimal(1),
    quantidade_source: `reflection_engine:${result.tipo}`,
    dobra: new Decimal(1),
    valor_devido: result.valor,
    valor_pago: new Decimal(0),
    diferenca: result.valor,
    correcao: new Decimal(0),
    juros: new Decimal(0),
    total: result.valor,
    formula_aplicada: `reflexo:${sourceItem.rubric_code}->${result.target_rubric}`,
    judicial_rule_id: sourceItem.judicial_rule_id,
    ativo: true,
    reflections: [],
    incidences: [],
    offsets: [],
    audit_trail: [
      ...result.audit,
      {
        campo: 'verba_origem',
        valor: sourceItem.rubric_name,
        fonte: 'reflection_engine',
        observacao: `Reflexo materializado a partir de ${sourceItem.competencia}`,
      },
    ],
  };
}

function getReflectionLabel(targetRubric: string): string {
  switch (targetRubric) {
    case '13_SALARIO':
      return 'Reflexo em 13º';
    case 'FERIAS_1_3':
      return 'Reflexo em Férias + 1/3';
    case 'AVISO_PREVIO':
      return 'Reflexo em Aviso Prévio';
    default:
      return `Reflexo ${targetRubric}`;
  }
}

function buildFinancialClosingItems(
  scenarioId: string,
  resultado: PjecalcLiquidacaoResultadoRow,
): CalculationItem[] {
  const items: CalculationItem[] = [];

  const pushSynthetic = (rubricCode: string, rubricName: string, amount: number, observation: string) => {
    if (Math.abs(amount) < 0.005) return;

    const decimalAmount = new Decimal(amount);
    items.push({
      id: crypto.randomUUID(),
      scenario_id: scenarioId,
      rubric_code: rubricCode,
      rubric_name: rubricName,
      competencia: CLOSING_COMPETENCIA,
      base: new Decimal(0),
      base_source: 'fechamento_financeiro',
      divisor: new Decimal(1),
      divisor_source: 'fechamento_financeiro',
      multiplicador: new Decimal(1),
      quantidade: new Decimal(1),
      quantidade_source: 'fechamento_financeiro',
      dobra: new Decimal(1),
      valor_devido: decimalAmount,
      valor_pago: new Decimal(0),
      diferenca: decimalAmount,
      correcao: new Decimal(0),
      juros: new Decimal(0),
      total: decimalAmount,
      formula_aplicada: observation,
      ativo: true,
      reflections: [],
      incidences: [],
      offsets: [],
      audit_trail: [
        {
          campo: rubricCode,
          valor: decimalAmount.toNumber(),
          fonte: 'pjecalc_liquidacao_resultado',
          observacao: observation,
        },
      ],
    });
  };

  pushSynthetic(
    'FECHAMENTO_IRRF',
    'IRRF (dedução)',
    -(resultado.irrf || 0),
    'Dedução fiscal do fechamento final.',
  );

  pushSynthetic(
    'FECHAMENTO_CS_EMPREGADOR',
    'CS Empregador',
    resultado.inss_patronal || 0,
    'Encargo patronal agregado ao total devido pela reclamada.',
  );

  pushSynthetic(
    'FECHAMENTO_HONORARIOS',
    'Honorários',
    resultado.honorarios || 0,
    'Honorários incluídos no fechamento final.',
  );

  pushSynthetic(
    'FECHAMENTO_CUSTAS',
    'Custas',
    resultado.custas || 0,
    'Custas processuais incluídas no fechamento final.',
  );

  pushSynthetic(
    'FECHAMENTO_FGTS',
    'FGTS + Multa',
    (resultado.fgts_depositar || 0) + (resultado.fgts_multa_40 || 0),
    'Encargos de FGTS consolidados no fechamento final.',
  );

  return items;
}
