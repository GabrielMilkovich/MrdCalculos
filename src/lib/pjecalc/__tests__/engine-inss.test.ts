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

    // Uses 2025-06 so the 2025 default fallback faixas apply (historical fallback only hits pre-2025)
    const hist = makeHistoricoWithOcorrencias(3000, ['2025-06']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      valor: 'informado',
      valor_informado_devido: 3000,
      valor_informado_pago: 0,
      periodo_inicio: '2025-06-01',
      periodo_fim: '2025-06-30',
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

    // Progressive calculation on R$ 3000 (ROUND_HALF_EVEN per etapa):
    // Band 1: 1518.00 * 0.075 = 113.85 (exact)
    // Band 2: (2793.88 - 1518.00) = 1275.88 * 0.09 = 114.8292 → ROUND_HALF_EVEN → 114.83
    // Band 3: (3000.00 - 2793.88) = 206.12 * 0.12 = 24.7344 → ROUND_HALF_EVEN → 24.73
    // Total = 113.85 + 114.83 + 24.73 = 253.41
    expect(cs.total_segurado).toBeCloseTo(253.41, 2);
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
    // Uses 2025-06 so the 2025 teto (8157.41) from DEFAULT faixas applies
    const hist = makeHistoricoWithOcorrencias(10000, ['2025-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 10000,
      valor_informado_pago: 0,
      periodo_inicio: '2025-06-01',
      periodo_fim: '2025-06-30',
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

    // With teto=8157.41, progressive INSS (ROUND_HALF_EVEN per etapa):
    // Band 1: 1518.00 * 0.075 = 113.85
    // Band 2: (2793.88 - 1518.00) = 1275.88 * 0.09 = 114.8292 → 114.83
    // Band 3: (5839.45 - 2793.88) = 3045.57 * 0.12 = 365.4684 → 365.47
    // Band 4: (8157.41 - 5839.45) = 2317.96 * 0.14 = 324.5144 → 324.51
    // Total = 113.85 + 114.83 + 365.47 + 324.51 = 918.66
    expect(cs.total_segurado).toBeCloseTo(918.66, 2);
  });

  it('handles base exactly at band boundary (1518.00)', () => {
    // 1518.00 é o boundary exato da 1ª faixa 2025 — usa 2025-06 para bater com o DEFAULT
    const hist = makeHistoricoWithOcorrencias(1518, ['2025-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 1518,
      valor_informado_pago: 0,
      periodo_inicio: '2025-06-01',
      periodo_fim: '2025-06-30',
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
    // Exactly at first band: 1518.00 * 0.075 = 113.85 (exact, no rounding needed)
    expect(result.contribuicao_social.total_segurado).toBe(113.85);
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
