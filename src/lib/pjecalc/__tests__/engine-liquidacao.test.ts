import { describe, it, expect } from 'vitest';
import { createEngine, makeVerba, makeHistoricoWithOcorrencias } from './helpers';

describe('PjeCalcEngine - liquidar() integration', () => {
  it('produces a complete liquidacao result with all fields', () => {
    const comps = ['2023-01', '2023-02', '2023-03'];
    const hist = makeHistoricoWithOcorrencias(3000, comps);

    const verbaHE = makeVerba({
      id: 'verba-he',
      nome: 'HE 50%',
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 220,
      multiplicador: 1.5,
      quantidade_informada: 10,
      tipo_quantidade: 'informada',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-03-31',
    });

    const verbaMulta = makeVerba({
      id: 'verba-multa',
      nome: 'Multa 477',
      valor: 'informado',
      valor_informado_devido: 3000,
      valor_informado_pago: 0,
      caracteristica: 'comum',
      ocorrencia_pagamento: 'desligamento',
      periodo_inicio: '2023-12-01',
      periodo_fim: '2023-12-31',
      incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
      ordem: 2,
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verbaHE, verbaMulta],
      fgtsConfig: { apurar: true, multa_apurar: true, multa_percentual: 40, multa_base: 'devido' },
      csConfig: { apurar_segurado: true, cobrar_reclamante: true, apurar_empresa: true, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: true, dependentes: 0, deduzir_cs: true, tributacao_exclusiva_13: false, tributacao_separada_ferias: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();

    // ── Structure assertions ──
    expect(result.data_liquidacao).toBe('2025-06-01');
    expect(result.verbas).toHaveLength(2);
    expect(result.fgts).toBeDefined();
    expect(result.contribuicao_social).toBeDefined();
    expect(result.imposto_renda).toBeDefined();
    expect(result.seguro_desemprego).toBeDefined();
    expect(result.resumo).toBeDefined();
    expect(result.validacao).toBeDefined();
    expect(result.audit_trail).toBeDefined();
    expect(result.audit_trail!.length).toBeGreaterThan(0);

    // ── Resumo assertions ──
    const r = result.resumo;
    expect(r.principal_bruto).toBeGreaterThan(0);
    expect(r.principal_corrigido).toBeGreaterThan(0);
    expect(r.liquido_reclamante).toBeDefined();
    expect(r.total_reclamada).toBeDefined();
    expect(typeof r.liquido_reclamante).toBe('number');
    expect(typeof r.total_reclamada).toBe('number');

    // ── Verbas populated ──
    const vr1 = result.verbas[0];
    expect(vr1.ocorrencias.length).toBeGreaterThan(0);
    expect(vr1.total_devido).toBeGreaterThan(0);
    expect(vr1.total_diferenca).toBeGreaterThanOrEqual(0);
  });

  it('produces valid validation result', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 1000,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    expect(result.validacao).toBeDefined();
    expect(result.validacao!.itens).toBeDefined();
    expect(typeof result.validacao!.erros).toBe('number');
    expect(typeof result.validacao!.alertas).toBe('number');
  });

  it('audit trail contains module entries', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);
    const verba = makeVerba({
      valor: 'informado',
      valor_informado_devido: 1000,
      periodo_inicio: '2023-06-01',
      periodo_fim: '2023-06-30',
    });

    const engine = createEngine({
      historicos: [hist],
      verbas: [verba],
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    const trail = result.audit_trail!;

    // Should have validation, verba, correcao, fgts, cs, ir, resumo steps
    expect(trail.some(e => e.module === 'validacao')).toBe(true);
    expect(trail.some(e => e.module === 'verba')).toBe(true);
    expect(trail.some(e => e.module === 'resumo')).toBe(true);
  });

  it('liquido = bruto - CS - IR (simplified check)', () => {
    const hist = makeHistoricoWithOcorrencias(5000, ['2023-06']);
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
      fgtsConfig: { apurar: false },
      csConfig: { apurar_segurado: true, cobrar_reclamante: true, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: true, dependentes: 0, deduzir_cs: true, tributacao_exclusiva_13: false, tributacao_separada_ferias: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    const r = result.resumo;

    // liquido = bruto corrigido + juros + salario_familia - cs - ir - prev_privada - pensao - contrib_sindical
    const expectedLiquido = r.principal_corrigido + r.juros_mora + r.salario_familia
      - r.cs_segurado - r.ir_retido - r.previdencia_privada - r.pensao_total - r.contribuicao_sindical;
    expect(r.liquido_reclamante).toBeCloseTo(expectedLiquido, 1);
  });

  it('handles empty verbas gracefully', () => {
    const hist = makeHistoricoWithOcorrencias(3000, ['2023-06']);

    const engine = createEngine({
      historicos: [hist],
      verbas: [],
      fgtsConfig: { apurar: false },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false },
      irConfig: { apurar: false },
      correcaoConfig: { indice: 'nenhum', juros_tipo: 'nenhum', data_liquidacao: '2025-06-01' },
    });

    const result = engine.liquidar();
    expect(result.verbas).toHaveLength(0);
    expect(result.resumo.principal_bruto).toBe(0);
    expect(result.resumo.liquido_reclamante).toBe(0);
  });
});
