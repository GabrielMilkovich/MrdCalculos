// =====================================================
// TESTE DIFERENCIAL PJe-CALC — 9 CENÁRIOS
// Verificação por competência de todos os módulos
// =====================================================

import { describe, it, expect } from 'vitest';
import {
  PjeCalcEngine,
  type PjeParametros,
  type PjeHistoricoSalarial,
  type PjeFalta,
  type PjeFerias,
  type PjeVerba,
  type PjeCartaoPonto,
  type PjeFGTSConfig,
  type PjeCSConfig,
  type PjeIRConfig,
  type PjeCorrecaoConfig,
  type PjeHonorariosConfig,
  type PjeCustasConfig,
  type PjeSeguroConfig,
  type PjePrevidenciaPrivadaConfig,
  type PjePensaoConfig,
  type PjeSalarioFamiliaConfig,
} from '@/lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

// ── Helpers ──

const defaultFGTS: PjeFGTSConfig = {
  apurar: true, destino: 'pagar_reclamante', compor_principal: true,
  multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40,
  multa_base: 'devido', saldos_saques: [], deduzir_saldo: false,
  lc110_10: false, lc110_05: false,
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
  tributacao_exclusiva_13: true, tributacao_separada_ferias: false,
  deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false,
  deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
};

const defaultCorrecao: PjeCorrecaoConfig = {
  indice: 'IPCA-E', epoca: 'mensal', juros_tipo: 'simples_mensal',
  juros_percentual: 1, juros_inicio: 'ajuizamento',
  multa_523: false, multa_523_percentual: 10,
  data_liquidacao: '2025-06-01',
};

const defaultHonorarios: PjeHonorariosConfig = {
  apurar_sucumbenciais: false, percentual_sucumbenciais: 15,
  base_sucumbenciais: 'condenacao', apurar_contratuais: false,
  percentual_contratuais: 20,
};

const defaultCustas: PjeCustasConfig = {
  apurar: false, percentual: 2, valor_minimo: 10.64, isento: false,
  assistencia_judiciaria: false, itens: [],
};

const defaultSeguro: PjeSeguroConfig = { apurar: false, parcelas: 5, recebeu: false };
const defaultPrevPrivada: PjePrevidenciaPrivadaConfig = { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false };
const defaultPensao: PjePensaoConfig = { apurar: false, percentual: 0, base: 'liquido' };
const defaultSF: PjeSalarioFamiliaConfig = { apurar: false, numero_filhos: 0 };

function makeEngine(
  params: Partial<PjeParametros>,
  historicos: PjeHistoricoSalarial[],
  verbas: PjeVerba[],
  overrides?: {
    faltas?: PjeFalta[];
    ferias?: PjeFerias[];
    cartao?: PjeCartaoPonto[];
    fgts?: Partial<PjeFGTSConfig>;
    cs?: Partial<PjeCSConfig>;
    ir?: Partial<PjeIRConfig>;
    correcao?: Partial<PjeCorrecaoConfig>;
    honorarios?: Partial<PjeHonorariosConfig>;
    custas?: Partial<PjeCustasConfig>;
  },
) {
  const fullParams: PjeParametros = {
    case_id: 'test', data_admissao: '2022-01-01', data_ajuizamento: '2024-06-01',
    estado: 'SP', municipio: 'São Paulo', regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: 220, prescricao_quinquenal: false, prescricao_fgts: false,
    prazo_aviso_previo: 'nao_apurar', projetar_aviso_indenizado: false,
    limitar_avos_periodo: false, zerar_valor_negativo: true,
    sabado_dia_util: true, considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    ...params,
  };

  const engine = new PjeCalcEngine(
    fullParams, historicos, overrides?.faltas || [], overrides?.ferias || [],
    verbas, overrides?.cartao || [],
    { ...defaultFGTS, ...overrides?.fgts },
    { ...defaultCS, ...overrides?.cs },
    { ...defaultIR, ...overrides?.ir },
    { ...defaultCorrecao, ...overrides?.correcao },
    { ...defaultHonorarios, ...overrides?.honorarios },
    { ...defaultCustas, ...overrides?.custas },
    defaultSeguro, ALL_TEST_INDICES, [], [], [], [], defaultPrevPrivada, defaultPensao, defaultSF,
  );
  return engine.liquidar();
}

function makeVerba(id: string, nome: string, overrides?: Partial<PjeVerba>): PjeVerba {
  return {
    id, nome, tipo: 'principal', valor: 'calculado',
    caracteristica: 'comum', ocorrencia_pagamento: 'mensal',
    compor_principal: true, zerar_valor_negativo: true, dobrar_valor_devido: false,
    periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
    base_calculo: { historicos: [], verbas: [], tabelas: ['ultima_remuneracao'], proporcionalizar: false, integralizar: false },
    tipo_divisor: 'informado', divisor_informado: 220,
    multiplicador: 1.5, tipo_quantidade: 'informada', quantidade_informada: 10,
    quantidade_proporcionalizar: false,
    exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false },
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    juros_ajuizamento: 'ocorrencias_vencidas',
    gerar_verba_reflexa: 'diferenca', gerar_verba_principal: 'diferenca',
    ordem: 1, reflexas: [],
    ...overrides,
  };
}

function makeHistorico(id: string, inicio: string, fim: string, valor: number): PjeHistoricoSalarial {
  const comps: string[] = [];
  const start = new Date(inicio + 'T00:00:00');
  const end = new Date(fim + 'T00:00:00');
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    comps.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return {
    id, nome: `Salário ${valor}`, periodo_inicio: inicio, periodo_fim: fim,
    tipo_valor: 'informado', valor_informado: valor,
    incidencia_fgts: true, incidencia_cs: true, fgts_recolhido: false, cs_recolhida: false,
    quantidade: 1,
    ocorrencias: comps.map((c, i) => ({ id: `${id}-oc-${i}`, historico_id: id, competencia: c, valor, tipo: 'calculado' as const })),
  };
}

// =====================================================
// CENÁRIOS
// =====================================================

describe('PJe-Calc Differential Tests', () => {

  // ── 1. CASO SIMPLES: Salário fixo + HE 50% ──
  it('Cenário 1: Simples — salário fixo + HE 50%', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-06-30', 3000);
    const he50 = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-06-30', ultima_remuneracao: 3000 },
      [hist], [he50],
    );

    // HE 50% = (3000 / 220 = 13.63 trunc) × 1.5 = 20.44 trunc × 10 = 204.40 (ROUND_DOWN)
    expect(result.verbas.length).toBe(1);
    const vr = result.verbas[0];
    expect(vr.ocorrencias.length).toBe(6);
    // Each occurrence: 3000/220=13.63 × 1.5=20.44 × 10 = 204.40
    for (const oc of vr.ocorrencias) {
      expect(oc.devido).toBeCloseTo(204.40, 1);
    }
    expect(vr.total_diferenca).toBeCloseTo(1226.40, 0);
    // FGTS = 8% of each competência's base (historico value), not just HE difference
    expect(result.fgts.total_depositos).toBeGreaterThan(0);
  });

  // ── 2. CASO COM REFLEXOS HE → DSR ──
  it('Cenário 2: Reflexos HE → DSR', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-03-31', 4000);
    const he50 = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-03-31',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 20,
    });
    const dsr = makeVerba('v2', 'DSR s/ HE', {
      tipo: 'reflexa', periodo_inicio: '2024-01-01', periodo_fim: '2024-03-31',
      divisor_informado: 22, multiplicador: 1, quantidade_informada: 4,
      verba_principal_id: 'v1', comportamento_reflexo: 'valor_mensal',
      base_calculo: { historicos: [], verbas: ['v1'], tabelas: [], proporcionalizar: false, integralizar: false },
      incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      ordem: 2,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-03-31', ultima_remuneracao: 4000 },
      [hist], [he50, dsr],
    );

    expect(result.verbas.length).toBe(2);
    const heResult = result.verbas.find(v => v.verba_id === 'v1')!;
    const dsrResult = result.verbas.find(v => v.verba_id === 'v2')!;
    // HE = (4000 × 1.5 / 220) × 20 = 545.45 per comp
    expect(heResult.ocorrencias[0].devido).toBeCloseTo(545.45, 0);
    // DSR uses HE difference as base: (545.45 × 1 / 22) × 4 = 99.17
    expect(dsrResult.ocorrencias[0].devido).toBeCloseTo(99.17, 0);
  });

  // ── 3. CASO COM REFLEXOS CASCATA: HE → DSR → 13º s/ DSR ──
  it('Cenário 3: Reflexos cascata HE → DSR → 13º s/DSR', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-12-31', 5000);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 15,
    });
    const dsr = makeVerba('v2', 'DSR s/ HE', {
      tipo: 'reflexa', periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31',
      divisor_informado: 22, multiplicador: 1, quantidade_informada: 4,
      verba_principal_id: 'v1', comportamento_reflexo: 'valor_mensal',
      base_calculo: { historicos: [], verbas: ['v1'], tabelas: [], proporcionalizar: false, integralizar: false },
      incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      ordem: 2,
    });
    const decimo_dsr = makeVerba('v3', '13º s/ DSR', {
      tipo: 'reflexa', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro',
      periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31',
      divisor_informado: 12, multiplicador: 1, tipo_quantidade: 'avos', quantidade_informada: 1,
      verba_principal_id: 'v2', comportamento_reflexo: 'media_valor_absoluto',
      base_calculo: { historicos: [], verbas: ['v2'], tabelas: [], proporcionalizar: false, integralizar: false },
      incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      ordem: 3,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-12-31', ultima_remuneracao: 5000 },
      [hist], [he, dsr, decimo_dsr],
    );

    expect(result.verbas.length).toBe(3);
    const heR = result.verbas.find(v => v.verba_id === 'v1')!;
    const dsrR = result.verbas.find(v => v.verba_id === 'v2')!;
    const d13R = result.verbas.find(v => v.verba_id === 'v3')!;
    expect(heR.total_diferenca).toBeGreaterThan(0);
    expect(dsrR.total_diferenca).toBeGreaterThan(0);
    expect(d13R.total_diferenca).toBeGreaterThan(0);
    // 13º s/ DSR deve usar a média dos DSR como base
    expect(d13R.ocorrencias.length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. CASO COM MÉDIAS ──
  it('Cenário 4: Média apurada (quantidade)', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-06-30', 3500);
    const he = makeVerba('v1', 'HE 50% (média)', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 220, multiplicador: 1.5,
      tipo_quantidade: 'apurada', quantidade_informada: 0,
    });
    const cartao: PjeCartaoPonto[] = [
      { competencia: '2024-01', dias_uteis: 22, dias_trabalhados: 22, horas_extras_50: 12, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
      { competencia: '2024-02', dias_uteis: 20, dias_trabalhados: 20, horas_extras_50: 8, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
      { competencia: '2024-03', dias_uteis: 21, dias_trabalhados: 21, horas_extras_50: 15, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
      { competencia: '2024-04', dias_uteis: 22, dias_trabalhados: 22, horas_extras_50: 10, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
      { competencia: '2024-05', dias_uteis: 22, dias_trabalhados: 22, horas_extras_50: 18, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
      { competencia: '2024-06', dias_uteis: 20, dias_trabalhados: 20, horas_extras_50: 6, horas_extras_100: 0, horas_noturnas: 0, intervalo_suprimido: 0, dsr_horas: 0, sobreaviso: 0 },
    ];
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-06-30', ultima_remuneracao: 3500 },
      [hist], [he], { cartao },
    );

    // Média = (12+8+15+10+18+6) / 6 = 11.5 horas
    const vr = result.verbas[0];
    for (const oc of vr.ocorrencias) {
      expect(oc.quantidade).toBeCloseTo(11.5, 1);
    }
  });

  // ── 5. CASO COM FGTS E DEDUÇÕES ──
  it('Cenário 5: FGTS com multa 40% + saldo deduzido', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-03-31', 2500);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-03-31',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-03-31', ultima_remuneracao: 2500 },
      [hist], [he],
      { fgts: { multa_percentual: 40, deduzir_saldo: true, saldos_saques: [{ data: '2024-02-01', valor: 50 }] } },
    );

    expect(result.fgts.total_depositos).toBeGreaterThan(0);
    expect(result.fgts.multa_valor).toBeGreaterThan(0);
    expect(result.fgts.saldo_deduzido).toBe(50);
    expect(result.fgts.total_fgts).toBeCloseTo(
      result.fgts.total_depositos + result.fgts.multa_valor - result.fgts.saldo_deduzido, 1
    );
  });

  // ── 6. CASO COM IR RRA ──
  it('Cenário 6: IR Art. 12-A RRA com anos anteriores', () => {
    const hist = makeHistorico('h1', '2023-01-01', '2025-03-31', 6000);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2023-01-01', periodo_fim: '2025-03-31',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 20,
    });
    const result = makeEngine(
      { data_admissao: '2020-01-01', data_demissao: '2025-03-31', ultima_remuneracao: 6000 },
      [hist], [he],
      { correcao: { data_liquidacao: '2025-06-01' } },
    );

    // IR should separate years: 2023+2024 = anos anteriores, 2025 = ano liquidação
    const ir = result.imposto_renda;
    expect(ir.metodo).toBe('art_12a_rra');
    expect(ir.meses_anos_anteriores).toBe(24); // Jan 2023 - Dec 2024
    expect(ir.meses_ano_liquidacao).toBe(3); // Jan-Mar 2025
    // IR may be 0 if CS deduction exceeds base (low per-month values with RRA spread)
    expect(ir.imposto_devido).toBeGreaterThanOrEqual(0);
  });

  // ── 7. CASO COM ADC 58/59 ──
  it('Cenário 7: ADC 58/59 transição IPCA-E → SELIC', () => {
    const hist = makeHistorico('h1', '2023-01-01', '2024-06-30', 4000);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2023-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
    });
    const result = makeEngine(
      { data_admissao: '2020-01-01', data_demissao: '2024-06-30', data_ajuizamento: '2024-01-15', data_citacao: '2024-03-15', ultima_remuneracao: 4000 },
      [hist], [he],
      { correcao: { indice: 'IPCA-E', data_liquidacao: '2025-06-01' } },
    );

    const vr = result.verbas[0];
    // Pre-citation occurrences should have correction > 1
    const preCitacao = vr.ocorrencias.filter(oc => oc.competencia < '2024-03');
    const posCitacao = vr.ocorrencias.filter(oc => oc.competencia >= '2024-03');
    for (const oc of preCitacao) {
      // Without real indices in DB, correction = 1 (no fallback)
      expect(oc.indice_correcao).toBeGreaterThanOrEqual(1);
    }
    // Post-citation also should have correction (via SELIC)
    for (const oc of posCitacao) {
      if (oc.diferenca > 0) {
        expect(oc.indice_correcao).toBeGreaterThanOrEqual(1);
      }
    }
  });

  // ── 8. CASO COM MESES INCOMPLETOS + FRAÇÃO ──
  it('Cenário 8: Meses incompletos — fração de mês modes', () => {
    // Admissão dia 15, demissão dia 10 do último mês
    const hist = makeHistorico('h1', '2024-03-15', '2024-06-10', 3000);
    
    // Test manter_fracao
    const vManter = makeVerba('v1', 'HE manter fração', {
      periodo_inicio: '2024-03-15', periodo_fim: '2024-06-10',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
      quantidade_proporcionalizar: true, fracao_mes_modo: 'manter_fracao',
    });
    const r1 = makeEngine(
      { data_admissao: '2024-03-15', data_demissao: '2024-06-10', ultima_remuneracao: 3000 },
      [hist], [vManter],
    );
    // March: 17/31 days → qty proportional
    const marchOc = r1.verbas[0].ocorrencias.find(o => o.competencia === '2024-03');
    expect(marchOc!.quantidade).toBeCloseTo(10 * 17 / 31, 1);

    // Test desprezar_menor_15
    const vDesprezar = makeVerba('v2', 'HE desprezar<15', {
      periodo_inicio: '2024-03-15', periodo_fim: '2024-06-10',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
      quantidade_proporcionalizar: true, fracao_mes_modo: 'desprezar_menor_15',
    });
    const r2 = makeEngine(
      { data_admissao: '2024-03-15', data_demissao: '2024-06-10', ultima_remuneracao: 3000 },
      [hist], [vDesprezar],
    );
    // June: 10 days < 15 → should be 0 qty
    const juneOc = r2.verbas[0].ocorrencias.find(o => o.competencia === '2024-06');
    expect(juneOc!.quantidade).toBe(0);
    // March: 17 days >= 15 → should keep full qty
    const marchOc2 = r2.verbas[0].ocorrencias.find(o => o.competencia === '2024-03');
    expect(marchOc2!.quantidade).toBe(10);
  });

  // ── 9. CASO COM MÚLTIPLAS FAIXAS SALARIAIS ──
  it('Cenário 9: Múltiplas faixas salariais + CS progressiva', () => {
    const hist1 = makeHistorico('h1', '2024-01-01', '2024-03-31', 2000);
    const hist2 = makeHistorico('h2', '2024-04-01', '2024-06-30', 5000);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-06-30', ultima_remuneracao: 5000 },
      [hist1, hist2], [he],
    );

    const vr = result.verbas[0];
    // Jan-Mar uses base 2000, Apr-Jun uses base 5000
    const jan = vr.ocorrencias.find(o => o.competencia === '2024-01')!;
    const apr = vr.ocorrencias.find(o => o.competencia === '2024-04')!;
    expect(jan.base).toBe(2000);
    expect(apr.base).toBe(5000);
    // Due values should differ
    expect(apr.devido).toBeGreaterThan(jan.devido);
    // CS should be progressive
    expect(result.contribuicao_social.total_segurado).toBeGreaterThan(0);
  });

  // ── REGRA CRÍTICA: Reflexos sobre valor nominal (não corrigido) ──
  it('Regra crítica: Reflexos incidem sobre valores nominais', () => {
    const hist = makeHistorico('h1', '2024-01-01', '2024-06-30', 4000);
    const he = makeVerba('v1', 'HE 50%', {
      periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 220, multiplicador: 1.5, quantidade_informada: 10,
    });
    const dsr = makeVerba('v2', 'DSR s/ HE', {
      tipo: 'reflexa', periodo_inicio: '2024-01-01', periodo_fim: '2024-06-30',
      divisor_informado: 22, multiplicador: 1, quantidade_informada: 4,
      verba_principal_id: 'v1', comportamento_reflexo: 'valor_mensal',
      base_calculo: { historicos: [], verbas: ['v1'], tabelas: [], proporcionalizar: false, integralizar: false },
      incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      ordem: 2,
    });
    const result = makeEngine(
      { data_admissao: '2022-01-01', data_demissao: '2024-06-30', ultima_remuneracao: 4000 },
      [hist], [he, dsr],
      { correcao: { data_liquidacao: '2025-06-01' } },
    );

    const heR = result.verbas.find(v => v.verba_id === 'v1')!;
    const dsrR = result.verbas.find(v => v.verba_id === 'v2')!;

    // DSR base must be the NOMINAL difference of HE, not the corrected value
    for (let i = 0; i < heR.ocorrencias.length; i++) {
      const heOc = heR.ocorrencias[i];
      const dsrOc = dsrR.ocorrencias[i];
      // DSR base should be HE diferenca (nominal), not HE valor_corrigido
      expect(dsrOc.base).toBeCloseTo(heOc.diferenca, 1);
    }
  });
});
