/**
 * =====================================================
 * DOMAIN REFLECTION ENGINE — Motor de Reflexos Auditável
 * =====================================================
 * 
 * Camada de domínio sobre o reflexo-engine existente.
 * Adiciona:
 * - Precisão com Decimal.js
 * - Trilha de auditoria por reflexo
 * - Respeito a vedações do título executivo
 * - Cálculo de médias para reflexos anuais/rescisórios
 */

import Decimal from 'decimal.js';
import type {
  CalculationItem, CalculationItemReflection,
  ReflectionRuleConfig, AuditTrailEntry,
  Competencia, UUID,
} from './types';

// =====================================================
// REFLECTION CONTEXT
// =====================================================

export interface ReflectionContext {
  /** Calculation items (source verbas) that generate reflections */
  sourceItems: CalculationItem[];
  /** Scenario parameters */
  admissao: string;
  demissao?: string;
  /** Rules from judicial title (may forbid certain reflections) */
  vedasReflexo: { rubric_code: string; target_rubric: string }[];
  /** Global config */
  zerarNegativo: boolean;
}

// =====================================================
// REFLECTION RESULT
// =====================================================

export interface ReflectionResult {
  item_id: UUID;
  source_rubric: string;
  target_rubric: string;
  tipo: 'mensal' | 'anual' | 'rescisorio';
  competencia_destino: Competencia;
  base: Decimal;
  multiplicador: Decimal;
  divisor: Decimal;
  valor: Decimal;
  audit: AuditTrailEntry[];
}

// =====================================================
// REFLECTION TEMPLATES
// =====================================================

const DEFAULT_REFLECTION_RULES: ReflectionRuleConfig[] = [
  {
    target_rubric: 'RSR',
    tipo: 'mensal',
    base_multiplier: 1,
    divisor: 22, // dias úteis padrão
    periodo_media: undefined,
    usa_avos: false,
    fracao_mes: 'manter',
  },
  {
    target_rubric: '13_SALARIO',
    tipo: 'anual',
    base_multiplier: 1,
    divisor: 12,
    periodo_media: 'ano_civil',
    usa_avos: true,
    fracao_mes: 'desprezar_menor_15',
  },
  {
    target_rubric: 'FERIAS_1_3',
    tipo: 'anual',
    base_multiplier: 1.3333,
    divisor: 12,
    periodo_media: 'periodo_aquisitivo',
    usa_avos: true,
    fracao_mes: 'desprezar_menor_15',
  },
  {
    target_rubric: 'AVISO_PREVIO',
    tipo: 'rescisorio',
    base_multiplier: 1,
    divisor: 12,
    periodo_media: '12_meses',
    usa_avos: true,
    fracao_mes: 'integralizar',
  },
  {
    target_rubric: 'FGTS_REFLEXO',
    tipo: 'mensal',
    base_multiplier: 0.08,
    divisor: 1,
    periodo_media: undefined,
    usa_avos: false,
    fracao_mes: 'manter',
  },
];

// =====================================================
// CORE ENGINE
// =====================================================

export function generateReflections(
  ctx: ReflectionContext,
  customRules?: ReflectionRuleConfig[],
): ReflectionResult[] {
  const rules = customRules || DEFAULT_REFLECTION_RULES;
  const results: ReflectionResult[] = [];

  // Group source items by rubric
  const itemsByRubric = new Map<string, CalculationItem[]>();
  for (const item of ctx.sourceItems) {
    if (!item.ativo || item.diferenca.lte(0)) continue;
    const existing = itemsByRubric.get(item.rubric_code) || [];
    existing.push(item);
    itemsByRubric.set(item.rubric_code, existing);
  }

  for (const [rubricCode, items] of itemsByRubric) {
    for (const rule of rules) {
      // Check if this reflection is forbidden by judicial title
      const isVedado = ctx.vedasReflexo.some(
        v => v.rubric_code === rubricCode && v.target_rubric === rule.target_rubric
      );
      if (isVedado) continue;

      // Skip self-referential reflections
      if (rubricCode === rule.target_rubric) continue;
      // Skip RSR on RSR
      if (rule.target_rubric === 'RSR' && rubricCode.includes('RSR')) continue;

      if (rule.tipo === 'mensal') {
        // Generate one reflection per competência
        for (const item of items) {
          const base = item.diferenca;
          const mult = new Decimal(rule.base_multiplier);
          const div = new Decimal(rule.divisor);
          const valor = base.times(mult).div(div).toDP(2);

          if (ctx.zerarNegativo && valor.lt(0)) continue;
          if (valor.eq(0)) continue;

          results.push({
            item_id: item.id,
            source_rubric: rubricCode,
            target_rubric: rule.target_rubric,
            tipo: 'mensal',
            competencia_destino: item.competencia,
            base,
            multiplicador: mult,
            divisor: div,
            valor,
            audit: [{
              campo: `reflexo_${rule.target_rubric}`,
              valor: valor.toNumber(),
              fonte: `reflection_engine`,
              regra: `${rubricCode} → ${rule.target_rubric}: base×${rule.base_multiplier}/${rule.divisor}`,
              observacao: `Reflexo mensal sobre ${item.rubric_name}`,
            }],
          });
        }
      } else if (rule.tipo === 'anual') {
        // Group by year, calculate average, multiply by avos
        const byYear = groupByYear(items);
        for (const [year, yearItems] of byYear) {
          const media = calcularMedia(yearItems);
          const avos = rule.usa_avos ? calcularAvos(yearItems, rule.fracao_mes) : new Decimal(12);
          const mult = new Decimal(rule.base_multiplier);
          const div = new Decimal(rule.divisor);
          const valor = media.times(mult).times(avos).div(div).toDP(2);

          if (ctx.zerarNegativo && valor.lt(0)) continue;
          if (valor.eq(0)) continue;

          results.push({
            item_id: yearItems[0].id,
            source_rubric: rubricCode,
            target_rubric: rule.target_rubric,
            tipo: 'anual',
            competencia_destino: `${year}-12`,
            base: media,
            multiplicador: mult.times(avos),
            divisor: div,
            valor,
            audit: [{
              campo: `reflexo_${rule.target_rubric}_${year}`,
              valor: valor.toNumber(),
              fonte: `reflection_engine`,
              regra: `Média=${media.toFixed(2)} × ${avos}/${div} × ${mult}`,
              observacao: `Reflexo anual ${year}: ${yearItems.length} competências`,
            }],
          });
        }
      } else if (rule.tipo === 'rescisorio') {
        // Use last 12 months average
        const sorted = [...items].sort((a, b) => b.competencia.localeCompare(a.competencia));
        const last12 = sorted.slice(0, 12);
        if (last12.length === 0) continue;

        const media = calcularMedia(last12);
        const avos = rule.usa_avos ? new Decimal(1) : new Decimal(1); // rescisório = 1 avo
        const mult = new Decimal(rule.base_multiplier);
        const div = new Decimal(rule.divisor);
        const valor = media.times(mult).times(avos).div(div).toDP(2);

        if (ctx.zerarNegativo && valor.lt(0)) continue;
        if (valor.eq(0)) continue;

        const lastComp = ctx.demissao
          ? `${ctx.demissao.slice(0, 4)}-${ctx.demissao.slice(5, 7)}`
          : last12[0].competencia;

        results.push({
          item_id: last12[0].id,
          source_rubric: rubricCode,
          target_rubric: rule.target_rubric,
          tipo: 'rescisorio',
          competencia_destino: lastComp,
          base: media,
          multiplicador: mult,
          divisor: div,
          valor,
          audit: [{
            campo: `reflexo_${rule.target_rubric}_rescisorio`,
            valor: valor.toNumber(),
            fonte: `reflection_engine`,
            regra: `Média últimos ${last12.length} meses × ${mult}/${div}`,
            observacao: `Reflexo rescisório sobre ${rubricCode}`,
          }],
        });
      }
    }
  }

  return results;
}

// =====================================================
// HELPERS
// =====================================================

function groupByYear(items: CalculationItem[]): Map<number, CalculationItem[]> {
  const map = new Map<number, CalculationItem[]>();
  for (const item of items) {
    const year = parseInt(item.competencia.slice(0, 4));
    const existing = map.get(year) || [];
    existing.push(item);
    map.set(year, existing);
  }
  return map;
}

function calcularMedia(items: CalculationItem[]): Decimal {
  if (items.length === 0) return new Decimal(0);
  let soma = new Decimal(0);
  for (const item of items) {
    soma = soma.plus(item.diferenca);
  }
  return soma.div(items.length).toDP(2);
}

function calcularAvos(
  items: CalculationItem[],
  fracaoMes: 'manter' | 'integralizar' | 'desprezar' | 'desprezar_menor_15',
): Decimal {
  // Count months with values
  const mesesComValor = items.filter(i => i.diferenca.gt(0)).length;

  switch (fracaoMes) {
    case 'integralizar':
      return new Decimal(Math.ceil(mesesComValor));
    case 'desprezar':
      return new Decimal(Math.floor(mesesComValor));
    case 'desprezar_menor_15':
      // If last month has less than 15 days worked, desprezar
      return new Decimal(mesesComValor);
    case 'manter':
    default:
      return new Decimal(mesesComValor);
  }
}

/**
 * Convert reflection results to CalculationItemReflection format
 * for embedding in CalculationItem.reflections
 */
export function reflectionResultToItemReflection(
  r: ReflectionResult,
): CalculationItemReflection {
  return {
    id: crypto.randomUUID(),
    item_id: r.item_id,
    target_rubric: r.target_rubric,
    tipo: r.tipo,
    base_multiplicador: r.multiplicador.toNumber(),
    divisor: r.divisor.toNumber(),
    valor: r.valor,
    competencia_destino: r.competencia_destino,
  };
}
