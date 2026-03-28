import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias } from './helpers';

describe('PjeCalcEngine - IRRF (Imposto de Renda)', () => {
  it('returns zero IR when base is below isencao threshold', () => {
    // Default IR band 1: ate 2259.20 = isento
    const hist = makeHistoricoWithOcorrencias(500, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 500,
      valor_informado_pago: 0,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      irConfig: {
        apurar: true,
        dependentes: 0,
        deduzir_cs: false,
        tributacao_exclusiva_13: false,
        tributacao_separada_ferias: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    // 500 is below the isencao threshold of 2259.20
    expect(result.imposto_renda.imposto_devido).toBe(0);
  });

  it('calculates IR in the correct progressive band', () => {
    // Create a case with enough value to fall into a taxable band
    // Using a single month — RRA method with meses=1
    const hist = makeHistoricoWithOcorrencias(5000, ['2025-03']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      periodo_inicio: '2025-03-01',
      periodo_fim: '2025-03-30',
      caracteristica: 'comum',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: {
        data_admissao: '2025-03-01',
        data_demissao: '2025-03-31',
      },
      irConfig: {
        apurar: true,
        dependentes: 0,
        deduzir_cs: false,
        tributacao_exclusiva_13: false,
        tributacao_separada_ferias: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    // IR with RRA meses=1 (data_admissao=2025-03-01, data_demissao=2025-03-31 = 1 month)
    // Base = 5000 (valor_final with no correction)
    // Deducoes = 0 (no CS, no dependentes)
    // base_tributavel = 5000
    // With meses=1, thresholds are: faixa.ate * 1
    // 5000 > 4664.68*1 → band 5 (aliquota=27.5%, deducao=896.00)
    // IR = 5000 * 0.275 - 896.00 * 1 = 1375.00 - 896.00 = 479.00
    expect(result.imposto_renda.imposto_devido).toBe(479);
  });

  it('deducts dependentes from base', () => {
    const hist = makeHistoricoWithOcorrencias(5000, ['2025-03']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      periodo_inicio: '2025-03-01',
      periodo_fim: '2025-03-30',
    });

    const engineNoDep = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: { data_admissao: '2025-03-01', data_demissao: '2025-03-31' },
      irConfig: { apurar: true, dependentes: 0, deduzir_cs: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const engineWithDep = createEngine({
      historicos: [hist],
      verbas: [verba],
      params: { data_admissao: '2025-03-01', data_demissao: '2025-03-31' },
      irConfig: { apurar: true, dependentes: 2, deduzir_cs: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const irNoDep = engineNoDep.liquidar().imposto_renda;
    const irWithDep = engineWithDep.liquidar().imposto_renda;

    // Deductions for dependentes reduce the base, so IR with dependentes <= IR without
    expect(irWithDep.imposto_devido).toBeLessThanOrEqual(irNoDep.imposto_devido);
    // The deduction per dependent is 189.59 per month
    expect(irWithDep.deducoes).toBeGreaterThan(irNoDep.deducoes);
  });

  it('uses Art 12-A RRA method for multi-month period', () => {
    const comps = ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06'];
    const hist = makeHistoricoWithOcorrencias(3000, comps);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 3000,
      valor_informado_pago: 0,
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      irConfig: {
        apurar: true,
        dependentes: 0,
        deduzir_cs: false,
        tributacao_exclusiva_13: false,
        tributacao_separada_ferias: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: {
        indice: 'nenhum',
        juros_tipo: 'nenhum',
        data_liquidacao: '2025-06-01',
      },
    });

    const result = engine.liquidar();
    // Multi-month period should use RRA method
    expect(result.imposto_renda.metodo).toBe('art_12a_rra');
    // meses_rra = total competencias in getPeriodoCalculo (admissao to demissao)
    expect(result.imposto_renda.meses_rra).toBeGreaterThanOrEqual(6);
  });

  it('returns zero IR when apurar is false', () => {
    const hist = makeHistoricoWithOcorrencias(10000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 10000,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    expect(result.imposto_renda.imposto_devido).toBe(0);
  });

  it('tributacao exclusiva 13o: calculates 13o IR separately', () => {
    const hist = makeHistoricoWithOcorrencias(5000, ['2023-12']);
    const verbaComum = makeVerba({
      id: 'verba-comum',
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      caracteristica: 'comum',
      periodo_inicio: '2023-12-01',
      periodo_fim: '2023-12-31',
    });
    const verba13 = makeVerba({
      id: 'verba-13',
      nome: '13o Salario',
      valor: 'informado',
      valor_informado_devido: 5000,
      valor_informado_pago: 0,
      caracteristica: '13_salario',
      ocorrencia_pagamento: 'dezembro',
      periodo_inicio: '2023-12-01',
      periodo_fim: '2023-12-31',
      ordem: 2,
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verbaComum, verba13],
      irConfig: {
        apurar: true,
        dependentes: 0,
        deduzir_cs: false,
        tributacao_exclusiva_13: true,
        tributacao_separada_ferias: false,
      },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    // 13o should be taxed separately
    expect(result.imposto_renda.ir_13_exclusivo).toBeGreaterThanOrEqual(0);
    expect(result.imposto_renda.imposto_devido).toBeGreaterThan(0);
  });
});
