import { describe, it, expect } from 'vitest';
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
    // juros from 2024-01 to 2025-01 = 12 months * 1% = 12%
    // juros = 204.40 * 0.01 * 12 = 24.52 (truncated)
    expect(oc.juros).toBeCloseTo(24.52, 1);
    expect(oc.valor_final).toBeCloseTo(204.40 + 24.52, 1);
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

    // citacao to liquidacao: 2024-06 to 2025-01 = 7 months
    // juros = 204.40 * 0.01 * 7 = 14.30
    expect(oc.juros).toBeCloseTo(14.30, 1);
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

    // Compound: 204.40 * ((1.01)^12 - 1) = 204.40 * 0.12682... = ~25.92
    // This should be slightly more than simple interest (24.52)
    expect(oc.juros).toBeGreaterThan(24);
    // Compound > simple for the same rate/period
    expect(oc.juros).toBeGreaterThan(24.52);
  });
});
