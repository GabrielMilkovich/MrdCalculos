import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias, makeINSSFaixas } from './helpers';

describe('PjeCalcEngine - INSS (Contribuição Social)', () => {
  it('calculates progressive INSS with historical 2023 bands', () => {
    // Using historical 2023 bands (Portaria MPS nº 26/2023):
    // 0-1320.00: 7.5%
    // 1320.01-2571.29: 9%
    // 2571.30-3856.94: 12%
    // 3856.95-7507.49: 14%

    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      valor: 'informado',
      valor_informado_devido: 3000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: true,
        cobrar_reclamante: true,
        limitar_teto: true,
        aliquota_segurado_tipo: 'empregado',
        apurar_empresa: false,
        apurar_sat: false,
        apurar_terceiros: false,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const cs = result.contribuicao_social;

    // Progressive calculation on R$ 3000 with 2023 table:
    // Band 1: 1320.00 × 0.075 = 99.00
    // Band 2: (2571.29 - 1320.00) × 0.09 = 112.62
    // Band 3: (3000.00 - 2571.29) × 0.12 = 51.45
    // Total ≈ 263.07
    expect(cs.total_segurado).toBeCloseTo(263.07, 1);
    expect(cs.segurado_devidos.length).toBe(1);
  });

  it('uses fixed aliquota when configured', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: true,
        cobrar_reclamante: true,
        limitar_teto: false,
        aliquota_segurado_tipo: 'fixa',
        aliquota_segurado_fixa: 11,
        apurar_empresa: false,
        apurar_sat: false,
        apurar_terceiros: false,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    // 5000 * 11% = 550
    expect(result.contribuicao_social.total_segurado).toBe(550);
  });

  it('calculates employer portion (20% + SAT/RAT + terceiros)', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 4000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: false,
        cobrar_reclamante: false,
        limitar_teto: true,
        apurar_empresa: true,
        apurar_sat: true,
        apurar_terceiros: true,
        aliquota_empresa_fixa: 20,
        aliquota_sat_fixa: 2,
        aliquota_terceiros_fixa: 5.8,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const cs = result.contribuicao_social;

    // Employer: 4000 * 20% = 800
    // SAT: 4000 * 2% = 80
    // Terceiros: 4000 * 5.8% = 232
    // Total employer = 1112
    expect(cs.total_empregador).toBeCloseTo(1112, 0);
    expect(cs.empregador.length).toBe(1);
    expect(cs.empregador[0].empresa).toBeCloseTo(800, 0);
    expect(cs.empregador[0].sat).toBeCloseTo(80, 0);
    expect(cs.empregador[0].terceiros).toBeCloseTo(232, 0);
  });

  it('limits base to teto INSS', () => {
    const hist = makeHistoricoWithOcorrencias(10000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 10000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: true,
        cobrar_reclamante: true,
        limitar_teto: true,
        aliquota_segurado_tipo: 'empregado',
        apurar_empresa: false,
        apurar_sat: false,
        apurar_terceiros: false,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    const cs = result.contribuicao_social;

    // Uses 2023 table (teto=7507.49), base capped from 10000:
    // Band 1: 1320.00 × 0.075 = 99.00
    // Band 2: (2571.29 - 1320.00) × 0.09 = 112.62
    // Band 3: (3856.94 - 2571.29) × 0.12 = 154.28
    // Band 4: (7507.49 - 3856.94) × 0.14 = 511.08
    // Total ≈ 876.98
    expect(cs.total_segurado).toBeCloseTo(876.98, 1);
  });

  it('handles base exactly at band boundary (1518.00)', () => {
    const hist = makeHistoricoWithOcorrencias(1518, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 1518,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: true,
        cobrar_reclamante: true,
        limitar_teto: true,
        aliquota_segurado_tipo: 'empregado',
        apurar_empresa: false,
        apurar_sat: false,
        apurar_terceiros: false,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    // 2023 table: 1518.00 spans 2 bands (band 1 ends at 1320.00):
    // Band 1: 1320.00 × 0.075 = 99.00
    // Band 2: (1518.00 - 1320.00) × 0.09 = 17.82
    // Total = 116.82
    expect(result.contribuicao_social.total_segurado).toBeCloseTo(116.82, 1);
  });

  it('returns zero when apurar_segurado is false', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      csConfig: {
        apurar_segurado: false,
        cobrar_reclamante: false,
        apurar_empresa: false,
        apurar_sat: false,
        apurar_terceiros: false,
      },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    expect(result.contribuicao_social.total_segurado).toBe(0);
    expect(result.contribuicao_social.total_empregador).toBe(0);
  });
});
