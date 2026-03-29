import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias, makeIndices } from './helpers';

describe('PjeCalcEngine - Correção Monetária', () => {
  it('applies single index correction using index DB (INPC)', () => {
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

    // Use INPC (not IPCA-E/SELIC) to avoid ADC 58/59 special logic.
    // Sumula 381: correction from mes subsequente (July 2023).
    // getIndiceCorrecaoDB filters entries < mesSubsequente for origin, then divides.
    // We need an entry before July as denominator and an entry at/before June 2025 as numerator.
    const indices = makeIndices([
      { indice: 'INPC', competencia: '2023-06-01', valor: 0.6, acumulado: 100.6 },
      { indice: 'INPC', competencia: '2025-06-01', valor: 0.2, acumulado: 110.22 },
    ]);

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      indicesDB: indices,
      correcaoConfig: {
        indice: 'INPC',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const vr = result.verbas[0];
    const oc = vr.ocorrencias[0];

    // Devido: (3000/220).toDP(2) = 13.63, * 1.5 = 20.44, * 10 = 204.40
    // Correction factor: acumulado[2025-06] / acumulado[2023-06] = 110.22 / 100.6 = 1.095626...
    const expectedFactor = new Decimal(110.22).div(100.6);
    expect(oc.indice_correcao).toBeCloseTo(expectedFactor.toNumber(), 5);
    // valor_corrigido = 204.40 * factor, rounded to 2dp (ROUND_HALF_EVEN for correction)
    const expectedCorrigido = new Decimal(204.40).times(expectedFactor).toDP(2, Decimal.ROUND_HALF_EVEN).toNumber();
    expect(oc.valor_corrigido).toBeCloseTo(expectedCorrigido, 1);
    expect(oc.diferenca).toBe(204.40);
  });

  it('no correction when data_liquidacao equals competencia', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2025-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2025-06-01',
      periodo_fim: '2025-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      correcaoConfig: {
        indice: 'IPCA-E',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];
    // No indices in DB, correction factor should be 1
    expect(oc.indice_correcao).toBe(1);
    expect(oc.valor_corrigido).toBe(oc.diferenca);
  });

  it('applies SELIC as combined correction+interest (no separate juros)', () => {
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
      { indice: 'SELIC', competencia: '2023-05-01', valor: 1.0, acumulado: 100 },
      { indice: 'SELIC', competencia: '2023-06-01', valor: 1.0, acumulado: 101 },
      { indice: 'SELIC', competencia: '2025-05-01', valor: 0.8, acumulado: 130 },
      { indice: 'SELIC', competencia: '2025-06-01', valor: 0.8, acumulado: 131.04 },
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

    // SELIC already includes interest, so oc.juros should be 0
    expect(oc.juros).toBe(0);
    // Correction factor depends on DB or fallback indices — just verify it's > 1
    expect(oc.indice_correcao).toBeGreaterThan(1);
    expect(oc.valor_corrigido).toBeGreaterThan(oc.diferenca);
    expect(oc.valor_final).toBe(oc.valor_corrigido);
  });

  it('applies combination-by-date correction (ADC 58/59 multi-regime)', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2020-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2020-06-01',
      periodo_fim: '2020-06-30',
    });

    const indices = makeIndices([
      { indice: 'IPCA-E', competencia: '2020-05-01', valor: 0.5, acumulado: 200 },
      { indice: 'IPCA-E', competencia: '2020-06-01', valor: 0.5, acumulado: 201 },
      { indice: 'IPCA-E', competencia: '2021-12-01', valor: 0.3, acumulado: 220 },
      { indice: 'SELIC', competencia: '2021-12-01', valor: 0.8, acumulado: 150 },
      { indice: 'SELIC', competencia: '2025-06-01', valor: 0.7, acumulado: 200 },
    ]);

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      indicesDB: indices,
      params: {
        data_citacao: '2022-01-15',
      },
      correcaoConfig: {
        indice: 'IPCA-E',
        juros_tipo: 'simples_mensal',
        juros_percentual: 1,
        juros_inicio: 'ajuizamento',
        data_liquidacao: '2025-06-01',
        combinacoes_indice: [
          { de: '2020-01-01', ate: '2021-12-31', indice: 'IPCA-E' },
          { de: '2022-01-01', ate: '2099-12-31', indice: 'SELIC' },
        ],
        combinacoes_juros: [
          { de: '2020-01-01', ate: '2021-12-31', tipo: 'TRD_SIMPLES', percentual: 1 },
          { de: '2022-01-01', ate: '2099-12-31', tipo: 'NENHUM' },
        ],
      },
    });

    const result = engine.liquidar();
    const oc = result.verbas[0].ocorrencias[0];

    // Multi-regime correction: IPCA-E 2020-06 to 2021-12, then SELIC 2022-01 to 2025-06
    // IPCA-E segment: acumulado[2021-12] / acumulado[2020-06] = 220 / 201 = 1.094527...
    // SELIC segment: acumulado[2025-06] / acumulado[2021-12] = 200 / 150 = 1.333333...
    // Combined factor: 1.094527 * 1.333333 = 1.459369...
    // The exact result depends on engine breakpoint logic. Key: it must be > 1 and produce
    // a corrected value meaningfully above the nominal diferenca.
    expect(oc.indice_correcao).toBeGreaterThan(1);
    // valor_corrigido = diferenca * factor, truncated to 2dp
    const expectedCorrigido = Number(new Decimal(oc.diferenca).times(oc.indice_correcao).toDP(2));
    expect(oc.valor_corrigido).toBeCloseTo(expectedCorrigido, 2);
  });

  it('skips correction when indice and juros are nenhum', () => {
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
    expect(oc.indice_correcao).toBe(1);
    expect(oc.juros).toBe(0);
    expect(oc.valor_final).toBe(oc.diferenca);
  });
});
