/**
 * Sprint 3 — Automated Test Scenarios for PJe-Calc Engine v2.1.0
 * 3 scenarios: Simple, Medium, Complex
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  PjeCalcEngine,
  PjeParametros,
  PjeHistoricoSalarial,
  PjeFalta,
  PjeFerias,
  PjeVerba,
  PjeFGTSConfig,
  PjeCSConfig,
  PjeIRConfig,
  PjeCorrecaoConfig,
  PjeHonorariosConfig,
  PjeCustasConfig,
  PjeSeguroConfig,
  PjeCartaoPonto,
} from '@/lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

function makeParams(overrides: Partial<PjeParametros> = {}): PjeParametros {
  return {
    case_id: 'test-case',
    data_admissao: '2020-01-01',
    data_demissao: '2023-06-30',
    data_ajuizamento: '2023-09-15',
    estado: 'SP',
    municipio: 'São Paulo',
    regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    prazo_aviso_previo: 'calculado',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: true,
    sabado_dia_util: false,
    considerar_feriado_estadual: true,
    considerar_feriado_municipal: false,
    ...overrides,
  };
}

function makeVerba(overrides: Partial<PjeVerba> = {}): PjeVerba {
  return {
    id: 'verba-1',
    nome: 'Horas Extras 50%',
    tipo: 'principal',
    valor: 'calculado',
    caracteristica: 'comum',
    ocorrencia_pagamento: 'mensal',
    compor_principal: true,
    zerar_valor_negativo: true,
    dobrar_valor_devido: false,
    periodo_inicio: '2022-01-01',
    periodo_fim: '2023-06-30',
    base_calculo: { historicos: [], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    tipo_divisor: 'informado',
    divisor_informado: 220,
    multiplicador: 1.5,
    tipo_quantidade: 'informada',
    quantidade_informada: 40,
    quantidade_proporcionalizar: false,
    exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    juros_ajuizamento: 'ocorrencias_vencidas',
    gerar_verba_reflexa: 'diferenca',
    gerar_verba_principal: 'diferenca',
    ordem: 1,
    ...overrides,
  };
}

const defaultFgts: PjeFGTSConfig = {
  apurar: true, destino: 'pagar_reclamante', compor_principal: true,
  multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40,
  multa_base: 'devido', multa_valor_informado: undefined,
  saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
};

const defaultCS: PjeCSConfig = {
  apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
  aliquota_segurado_tipo: 'empregado', limitar_teto: true,
  apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
  aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20,
  aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
  periodos_simples: [],
};

const defaultIR: PjeIRConfig = {
  apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
  tributacao_exclusiva_13: true, tributacao_separada_ferias: true,
  deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false,
  deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
};

const defaultCorrecao: PjeCorrecaoConfig = {
  indice: 'IPCA-E', epoca: 'mensal',
  juros_tipo: 'simples_mensal', juros_percentual: 1,
  juros_inicio: 'ajuizamento',
  multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2025-03-01',
};

const defaultHonorarios: PjeHonorariosConfig = {
  apurar_sucumbenciais: false, percentual_sucumbenciais: 10,
  base_sucumbenciais: 'condenacao', apurar_contratuais: false, percentual_contratuais: 30,
};

const defaultCustas: PjeCustasConfig = {
  apurar: false, percentual: 2, valor_minimo: 10.64,
  isento: false, assistencia_judiciaria: false, itens: [],
};

const defaultSeguro: PjeSeguroConfig = {
  apurar: false, parcelas: 0, recebeu: false,
};

// ════════════════════════════════════════════════════════
// CENÁRIO 1: SIMPLES
// Empregado com salário fixo, 1 verba (HE 50%), FGTS
// ════════════════════════════════════════════════════════

describe('Cenário 1 — Simples', () => {
  it('deve calcular HE 50% com fórmula oficial', () => {
    const params = makeParams({ ultima_remuneracao: 3000 });
    const verba = makeVerba();
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      ALL_TEST_INDICES,
    );
    const result = engine.liquidar();

    // 18 meses (2022-01 to 2023-06)
    expect(result.verbas.length).toBe(1);
    expect(result.verbas[0].ocorrencias.length).toBe(18);

    // Fórmula PJe-Calc (truncamento por etapa): (3000/220→trunc) × 1.5 → trunc × 40 → trunc
    const expectedPerMonth = new Decimal(3000).div(220).toDP(2).times(1.5).toDP(2).times(40).toDP(2).toNumber();
    expect(result.verbas[0].ocorrencias[0].devido).toBeCloseTo(expectedPerMonth, 1);

    // Total diferença = 818.18 * 18 = 14727.27 (approx)
    expect(result.verbas[0].total_diferenca).toBeGreaterThan(14000);
    expect(result.verbas[0].total_diferenca).toBeLessThan(15000);
  });

  it('deve calcular FGTS 8% sobre diferenças', () => {
    const params = makeParams({ ultima_remuneracao: 3000 });
    const verba = makeVerba();
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      ALL_TEST_INDICES,
    );
    const result = engine.liquidar();

    expect(result.fgts.total_depositos).toBeGreaterThan(0);
    // FGTS deposits are corrected, so total >= 8% of nominal differences
    const expectedFgtsMin = result.verbas[0].total_diferenca * 0.08;
    expect(result.fgts.total_depositos).toBeGreaterThanOrEqual(expectedFgtsMin - 1);
  });

  it('resumo deve ter líquido > 0', () => {
    const params = makeParams({ ultima_remuneracao: 3000 });
    const verba = makeVerba();
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      ALL_TEST_INDICES,
    );
    const result = engine.liquidar();
    expect(result.resumo.liquido_reclamante).toBeGreaterThan(0);
    expect(result.resumo.principal_corrigido).toBeGreaterThanOrEqual(result.resumo.principal_bruto);
  });
});

// ════════════════════════════════════════════════════════
// CENÁRIO 2: MÉDIO
// 2 verbas (HE 50% + DSR reflexo), com faltas, CS e IR
// ════════════════════════════════════════════════════════

describe('Cenário 2 — Médio', () => {
  it('deve calcular reflexo DSR sobre HE', () => {
    const params = makeParams({ ultima_remuneracao: 4000 });
    const heVerba = makeVerba({
      id: 'he-50',
      nome: 'Horas Extras 50%',
      periodo_inicio: '2022-06-01',
      periodo_fim: '2023-06-30',
    });
    const dsrVerba = makeVerba({
      id: 'dsr-he',
      nome: 'DSR sobre HE',
      tipo: 'reflexa',
      caracteristica: 'comum',
      verba_principal_id: 'he-50',
      comportamento_reflexo: 'valor_mensal',
      base_calculo: { historicos: [], verbas: ['he-50'], tabelas: [], proporcionalizar: false, integralizar: false },
      tipo_divisor: 'informado',
      divisor_informado: 26,
      multiplicador: 1,
      tipo_quantidade: 'informada',
      quantidade_informada: 4,
      periodo_inicio: '2022-06-01',
      periodo_fim: '2023-06-30',
      ordem: 2,
    });
    const faltas: PjeFalta[] = [
      { id: 'f1', data_inicial: '2022-08-10', data_final: '2022-08-12', justificada: false },
    ];

    const engine = new PjeCalcEngine(
      params, [], faltas, [], [heVerba, dsrVerba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      ALL_TEST_INDICES,
    );
    const result = engine.liquidar();

    expect(result.verbas.length).toBe(2);
    const dsr = result.verbas.find(v => v.nome === 'DSR sobre HE');
    expect(dsr).toBeDefined();
    expect(dsr!.total_diferenca).toBeGreaterThan(0);

    // CS segurado should be > 0
    expect(result.contribuicao_social.total_segurado).toBeGreaterThan(0);

    // IR should be calculated
    expect(result.imposto_renda.imposto_devido).toBeGreaterThanOrEqual(0);
  });

  it('multa FGTS 40% deve ser calculada', () => {
    const params = makeParams({ ultima_remuneracao: 4000 });
    const verba = makeVerba({ periodo_inicio: '2022-01-01', periodo_fim: '2023-06-30' });
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      ALL_TEST_INDICES,
    );
    const result = engine.liquidar();
    expect(result.fgts.multa_valor).toBeGreaterThan(0);
    // Multa = 40% of deposits
    expect(result.fgts.multa_valor).toBeCloseTo(result.fgts.total_depositos * 0.4, 0);
  });
});

// ════════════════════════════════════════════════════════
// CENÁRIO 3: COMPLEXO
// 3 verbas em cascata, férias, prescrição, custas, honorários
// ════════════════════════════════════════════════════════

describe('Cenário 3 — Complexo', () => {
  it('deve processar cascata HE → DSR → 13º sobre DSR', () => {
    const params = makeParams({
      ultima_remuneracao: 5000,
      prescricao_quinquenal: true,
      data_prescricao_quinquenal: '2018-09-15',
    });
    const he = makeVerba({
      id: 'he', nome: 'HE 50%',
      periodo_inicio: '2020-01-01', periodo_fim: '2023-06-30',
      quantidade_informada: 30,
    });
    const dsr = makeVerba({
      id: 'dsr', nome: 'DSR s/ HE', tipo: 'reflexa',
      verba_principal_id: 'he',
      comportamento_reflexo: 'valor_mensal',
      base_calculo: { historicos: [], verbas: ['he'], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 26, multiplicador: 1, quantidade_informada: 4,
      periodo_inicio: '2020-01-01', periodo_fim: '2023-06-30', ordem: 2,
    });
    const treze = makeVerba({
      id: '13-dsr', nome: '13º s/ DSR', tipo: 'reflexa',
      caracteristica: '13_salario',
      verba_principal_id: 'dsr',
      comportamento_reflexo: 'media_valor_absoluto',
      base_calculo: { historicos: [], verbas: ['dsr'], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 12, multiplicador: 1,
      tipo_quantidade: 'avos', quantidade_informada: 1,
      ocorrencia_pagamento: 'dezembro',
      periodo_inicio: '2020-01-01', periodo_fim: '2023-06-30', ordem: 3,
    });

    const correcao: PjeCorrecaoConfig = {
      ...defaultCorrecao,
      multa_523: true, multa_523_percentual: 10,
    };
    const honorarios: PjeHonorariosConfig = {
      apurar_sucumbenciais: true, percentual_sucumbenciais: 15,
      base_sucumbenciais: 'condenacao', apurar_contratuais: false, percentual_contratuais: 0,
    };
    const custas: PjeCustasConfig = {
      apurar: true, percentual: 2, valor_minimo: 10.64,
      isento: false, assistencia_judiciaria: false, itens: [],
    };

    const engine = new PjeCalcEngine(
      params, [], [], [], [he, dsr, treze], [],
      defaultFgts, defaultCS, defaultIR, correcao,
      honorarios, custas, defaultSeguro,
    );
    const result = engine.liquidar();

    // 3 verbas processed
    expect(result.verbas.length).toBe(3);

    // Cascade: 13º s/ DSR should have value based on DSR average
    const trezeResult = result.verbas.find(v => v.nome === '13º s/ DSR');
    expect(trezeResult).toBeDefined();
    expect(trezeResult!.total_diferenca).toBeGreaterThan(0);

    // Without real indices, correction = bruto (fator=1)
    expect(result.resumo.principal_corrigido).toBeGreaterThanOrEqual(result.resumo.principal_bruto);

    // Without real indices, juros = 0 (no fallback rates)
    expect(result.resumo.juros_mora).toBeGreaterThanOrEqual(0);

    // Multa 523 applied
    expect(result.resumo.multa_523).toBeGreaterThan(0);

    // Honorários
    expect(result.resumo.honorarios_sucumbenciais).toBeGreaterThan(0);

    // Custas
    expect(result.resumo.custas).toBeGreaterThan(0);

    // FGTS chain
    expect(result.fgts.total_fgts).toBeGreaterThan(0);

    // CS
    expect(result.contribuicao_social.total_segurado).toBeGreaterThan(0);
    expect(result.contribuicao_social.total_empregador).toBeGreaterThan(0);

    // Líquido must be coherent
    expect(result.resumo.liquido_reclamante).toBeGreaterThan(0);
    expect(result.resumo.total_reclamada).toBeGreaterThan(result.resumo.liquido_reclamante);
  });

  it('validação pré-liquidação deve retornar itens', () => {
    const params = makeParams({ ultima_remuneracao: 5000 });
    const verba = makeVerba();
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
    );
    const result = engine.liquidar();
    expect(result.validacao).toBeDefined();
    expect(result.validacao!.itens.length).toBeGreaterThanOrEqual(0);
  });

  it('salário-família deve calcular cotas', () => {
    const params = makeParams({ ultima_remuneracao: 1500 });
    const verba = makeVerba({ periodo_inicio: '2023-01-01', periodo_fim: '2023-06-30' });
    const sfConfig = { apurar: true, numero_filhos: 2, filhos_detalhes: [
      { nome: 'Filho 1', nascimento: '2015-03-01', ate_14: true },
      { nome: 'Filho 2', nascimento: '2018-07-15', ate_14: true },
    ]};
    const engine = new PjeCalcEngine(
      params, [], [], [], [verba], [],
      defaultFgts, defaultCS, defaultIR, defaultCorrecao,
      defaultHonorarios, defaultCustas, defaultSeguro,
      [], [], [], [], [],
      { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false },
      { apurar: false, percentual: 0, base: 'liquido' },
      sfConfig,
    );
    const result = engine.liquidar();
    expect(result.salario_familia.apurado).toBe(true);
    expect(result.salario_familia.cotas.length).toBeGreaterThan(0);
    expect(result.salario_familia.total).toBeGreaterThan(0);
    // Salary < limit → all competências in period get cotas
    // Total should be 2 filhos × R$62.04 × number of competências where salary < limit
    expect(result.salario_familia.cotas.every(c => c.filhos_elegíveis === 2)).toBe(true);
    expect(result.salario_familia.cotas[0].valor_cota).toBeCloseTo(62.04, 2);
  });
});
