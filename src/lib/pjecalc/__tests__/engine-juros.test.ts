import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias, makeIndices } from './helpers';

describe('PjeCalcEngine - Juros de Mora', () => {
  it('calculates 1% per month simple interest from ajuizamento', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    // Use INPC (not IPCA-E/SELIC) to avoid ADC 58/59 logic
    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: {
        data_ajuizamento: '2024-01-01',
      },
      correcaoConfig: {
        indice: 'INPC',
        juros_tipo: 'simples_mensal',
        juros_percentual: 1,
        juros_inicio: 'ajuizamento',
        data_liquidacao: '2025-01-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];

    // diferenca=204.40, corrigido=204.40 (no index in DB => factor=1)
    // PJe-Calc uses mesesEntreInclusivo: 2024-01 to 2025-01 = 12 exclusive + 1 = 13 months
    // juros = 204.40 * 0.01 * 13 = 26.572 → truncated to 26.57
    expect(oc.diferenca).toBe(204.40);
    expect(oc.valor_corrigido).toBe(204.40);
    expect(oc.juros).toBeCloseTo(26.57, 2);
    expect(oc.valor_final).toBeCloseTo(204.40 + 26.57, 2);
  });

  it('calculates interest from citacao date', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    // Use INPC to avoid ADC 58/59 path
    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: {
        data_ajuizamento: '2024-01-01',
        data_citacao: '2024-06-01',
      },
      correcaoConfig: {
        indice: 'INPC',
        juros_tipo: 'simples_mensal',
        juros_percentual: 1,
        juros_inicio: 'citacao',
        data_liquidacao: '2025-01-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];

    // PJe-Calc mesesEntreInclusivo: 2024-06 to 2025-01 = 7 exclusive + 1 = 8 months
    // juros = 204.40 * 0.01 * 8 = 16.352 → truncated to 16.35
    expect(oc.diferenca).toBe(204.40);
    expect(oc.juros).toBeCloseTo(16.35, 2);
  });

  it('zero interest when juros_tipo is nenhum and indice is nenhum', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    // Both indice and juros set to nenhum to fully skip correction+interest
    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];
    expect(oc.juros).toBe(0);
  });

  it('SELIC as combined rate has zero separate interest', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const indices = makeIndices([
      { indice: 'SELIC', competencia: '2023-05-01', valor: 1, acumulado: 100 },
      { indice: 'SELIC', competencia: '2023-06-01', valor: 1, acumulado: 101 },
      { indice: 'SELIC', competencia: '2025-06-01', valor: 0.8, acumulado: 130 },
    ]);

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      indicesDB: indices,
      correcaoConfig: {
        indice: 'SELIC',
        juros_tipo: 'selic',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];
    // SELIC: interest is embedded in correction, separate juros = 0
    expect(oc.juros).toBe(0);
    expect(oc.valor_final).toBe(oc.valor_corrigido);
  });

  it('calculates compound interest when juros_tipo is composto', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    // Use INPC to avoid ADC 58/59 SELIC/IPCA-E detection
    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: {
        data_ajuizamento: '2024-01-01',
      },
      correcaoConfig: {
        indice: 'INPC',
        juros_tipo: 'composto' as any,
        juros_percentual: 1,
        juros_inicio: 'ajuizamento',
        data_liquidacao: '2025-01-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];

    // PJe-Calc mesesEntreInclusivo: 2024-01 to 2025-01 = 13 months
    // Compound: 204.40 * ((1.01)^13 - 1) = 204.40 * 0.138093... = ~28.22
    const expectedCompound = Number(
      new Decimal(204.40).times(Math.pow(1.01, 13) - 1).toDP(2)
    );
    expect(oc.diferenca).toBe(204.40);
    expect(oc.juros).toBeCloseTo(expectedCompound, 2);
    // Compound must be > simple interest (26.57) for same period
    expect(oc.juros).toBeGreaterThan(26.57);
  });
});
