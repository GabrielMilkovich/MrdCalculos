import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias, makeINSSFaixas } from './helpers';

describe('PjeCalcEngine - INSS (Contribuição Social)', () => {
  it('calculates progressive INSS with 2025 default bands', () => {
    // Using default bands:
    // 0-1518.00: 7.5%
    // 1518.01-2793.88: 9%
    // 2793.89-5839.45: 12%
    // 5839.46-8157.41: 14%

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

    // Progressive calculation on R$ 3000:
    // Band 1: 1518.00 * 7.5% = 113.85
    // Band 2: (2793.88 - 1518.00) * 9% = 1275.88 * 9% = 114.82 (banker's rounding)
    // Band 3: (3000 - 2793.88) * 12% = 206.12 * 12% = 24.73
    // Total ~= 253.40
    expect(cs.total_segurado).toBeGreaterThan(0);
    expect(cs.total_segurado).toBeLessThan(3000 * 0.14); // Must be less than max rate applied to full base
    expect(cs.segurado_devidos.length).toBeGreaterThanOrEqual(1);
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

    // With teto=8157.41, INSS max ~= (1518*0.075) + (1275.88*0.09) + (3045.57*0.12) + (2317.96*0.14)
    // = 113.85 + 114.83 + 365.46 + 324.51 = ~918.65
    // The actual value for 10000 capped at 8157.41 should be the same as for 8157.41
    // Key: result should be less than 10000 * 0.14 = 1400
    expect(cs.total_segurado).toBeLessThan(1000);
    expect(cs.total_segurado).toBeGreaterThan(800);
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
    // Exactly at first band: 1518 * 7.5% = 113.85
    expect(result.contribuicao_social.total_segurado).toBeCloseTo(113.85, 1);
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
