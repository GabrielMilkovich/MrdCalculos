/**
 * Tests for Domain Reflection Engine and Offset Engine
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { generateReflections, type ReflectionContext } from '@/domain/reflection-engine';
import { applyDomainOffsets, type DomainOffsetContext } from '@/domain/offset-engine';
import type { CalculationItem } from '@/domain/types';

function makeItem(rubric_code: string, competencia: string, diferenca: number): CalculationItem {
  return {
    id: crypto.randomUUID(),
    scenario_id: 'test-scenario',
    rubric_code,
    rubric_name: rubric_code,
    competencia,
    base: new Decimal(diferenca),
    base_source: 'test',
    divisor: new Decimal(1),
    divisor_source: 'test',
    multiplicador: new Decimal(1),
    quantidade: new Decimal(1),
    quantidade_source: 'test',
    dobra: new Decimal(1),
    valor_devido: new Decimal(diferenca),
    valor_pago: new Decimal(0),
    diferenca: new Decimal(diferenca),
    correcao: new Decimal(0),
    juros: new Decimal(0),
    total: new Decimal(diferenca),
    formula_aplicada: 'test',
    ativo: true,
    reflections: [],
    incidences: [],
    offsets: [],
    audit_trail: [],
  };
}

describe('Reflection Engine', () => {
  it('generates RSR mensal reflection', () => {
    const items = [
      makeItem('HE_50', '2024-01', 1000),
      makeItem('HE_50', '2024-02', 800),
    ];
    const ctx: ReflectionContext = {
      sourceItems: items,
      admissao: '2020-01-01',
      demissao: '2024-03-15',
      vedasReflexo: [],
      zerarNegativo: true,
    };
    const results = generateReflections(ctx);
    const rsrResults = results.filter(r => r.target_rubric === 'RSR');
    expect(rsrResults.length).toBe(2);
    // RSR = base × 1 / 22
    expect(rsrResults[0].valor.toNumber()).toBeCloseTo(45.45, 1);
  });

  it('generates 13º anual reflection with avos', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem('HE_50', `2024-${String(i + 1).padStart(2, '0')}`, 500)
    );
    const ctx: ReflectionContext = {
      sourceItems: items,
      admissao: '2020-01-01',
      demissao: '2024-12-31',
      vedasReflexo: [],
      zerarNegativo: true,
    };
    const results = generateReflections(ctx);
    const decimo = results.filter(r => r.target_rubric === '13_SALARIO');
    expect(decimo.length).toBeGreaterThan(0);
    expect(decimo[0].valor.toNumber()).toBeCloseTo(333.33, 0);
  });

  it('respects vedação from judicial title', () => {
    const items = [makeItem('HE_50', '2024-01', 1000)];
    const ctx: ReflectionContext = {
      sourceItems: items,
      admissao: '2020-01-01',
      vedasReflexo: [{ rubric_code: 'HE_50', target_rubric: 'AVISO_PREVIO' }],
      zerarNegativo: true,
    };
    const results = generateReflections(ctx);
    const aviso = results.filter(r => r.target_rubric === 'AVISO_PREVIO');
    expect(aviso.length).toBe(0);
  });

  it('generates FGTS reflection at 8%', () => {
    const items = [makeItem('HE_50', '2024-01', 2000)];
    const ctx: ReflectionContext = {
      sourceItems: items,
      admissao: '2020-01-01',
      vedasReflexo: [],
      zerarNegativo: true,
    };
    const results = generateReflections(ctx);
    const fgts = results.filter(r => r.target_rubric === 'FGTS_REFLEXO');
    expect(fgts.length).toBe(1);
    expect(fgts[0].valor.toNumber()).toBe(160);
  });
});

describe('Offset Engine (Domain)', () => {
  it('applies idêntico título offset', () => {
    const items = [
      makeItem('HE_50', '2024-01', 1000),
      makeItem('HE_50', '2024-02', 800),
    ];
    const ctx: DomainOffsetContext = {
      calculationItems: items,
      paidItems: [
        { id: 'paid-1', rubrica: 'HE_50', competencia: '2024-01', valor: 300, fonte: 'contracheque' },
        { id: 'paid-2', rubrica: 'HE_50', competencia: '2024-02', valor: 200, fonte: 'contracheque' },
      ],
      mode: 'identico_titulo',
    };
    const result = applyDomainOffsets(ctx);
    expect(result.summary.total_abatido).toBe(500);
    expect(result.summary.total_liquido).toBe(1300);

    const item1 = result.updatedItems.find(i => i.competencia === '2024-01');
    expect(item1!.diferenca.toNumber()).toBe(700);
    expect(item1!.offsets.length).toBe(1);
  });

  it('does not offset mismatched rubrics', () => {
    const items = [makeItem('HE_50', '2024-01', 1000)];
    const ctx: DomainOffsetContext = {
      calculationItems: items,
      paidItems: [
        { id: 'paid-1', rubrica: 'COMISSAO', competencia: '2024-01', valor: 500, fonte: 'contracheque' },
      ],
      mode: 'identico_titulo',
    };
    const result = applyDomainOffsets(ctx);
    expect(result.summary.total_abatido).toBe(0);
    expect(result.summary.unmatched_payments.length).toBe(1);
  });

  it('applies global offset across rubrics', () => {
    const items = [makeItem('HE_50', '2024-01', 1000)];
    const ctx: DomainOffsetContext = {
      calculationItems: items,
      paidItems: [
        { id: 'paid-1', rubrica: 'GRATIFICACAO', competencia: '2024-01', valor: 400, fonte: 'contracheque' },
      ],
      mode: 'global',
    };
    const result = applyDomainOffsets(ctx);
    expect(result.summary.total_abatido).toBe(400);
  });

  it('generates audit trail', () => {
    const items = [makeItem('HE_50', '2024-01', 1000)];
    const ctx: DomainOffsetContext = {
      calculationItems: items,
      paidItems: [
        { id: 'paid-1', rubrica: 'HE_50', competencia: '2024-01', valor: 300, fonte: 'contracheque' },
      ],
      mode: 'identico_titulo',
    };
    const result = applyDomainOffsets(ctx);
    expect(result.audit.length).toBeGreaterThan(0);
    expect(result.audit.some(a => a.campo.includes('abatimento'))).toBe(true);
  });
});
