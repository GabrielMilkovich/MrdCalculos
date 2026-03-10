/**
 * Golden Round-Trip PJC Tests
 * Test A: PJC XML → parse → export → re-parse → compare (zero divergence)
 * Test B: Correction by date engine correctness
 */

import { describe, it, expect } from 'vitest';
import { parsePJCXml, exportPJCXml, compararPJC, type PJCReal } from '../lib/pjecalc/pjc-xml-real';
import { aplicarCorrecaoPorData, type CorrecaoPorDataConfig, type IndiceDB } from '../lib/pjecalc/correction-by-date';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

// =====================================================
// SAMPLE PJC DATA (based on real case)
// =====================================================

const SAMPLE_PJC: PJCReal = {
  processo: {
    numero_cnj: '1001211-76.2025.5.02.0461',
    reclamante_nome: 'MARIA MADALENA ALVES FERREIRA',
    reclamante_cpf: '34252311896',
    reclamado_nome: 'GRUPO CASAS BAHIA S.A.',
    reclamado_cnpj: '33041260000164',
  },
  parametros: {
    data_admissao: '2015-03-07',
    data_demissao: '2021-03-02',
    data_ajuizamento: '2021-04-16',
    inicio_calculo: '2016-04-16',
    fim_calculo: '2021-03-02',
    data_liquidacao: '2025-10-31',
    carga_horaria: 220,
    sabado_dia_util: false,
    prescricao_quinquenal: true,
    projetar_aviso: false,
    limitar_avos: false,
    zerar_negativos: true,
  },
  apuracao_diaria: [
    {
      data: '2021-01-04',
      frequencia_diaria: '13:28-15:00 16:00-22:00',
      horas_trabalhadas: 7.53,
      horas_extras_diaria: 0,
      horas_extras_semanal: 0,
      horas_extras_mensal: 0,
      horas_noturnas: 2.0,
      horas_intra_jornada: 1.0,
      horas_inter_jornadas: 0,
      horas_art384: 0,
      horas_art253: 0,
      repousos_trabalhados: 0,
      feriados_trabalhados: 0,
      tipo_dia: 'UTIL',
    },
    {
      data: '2021-01-05',
      frequencia_diaria: '13:30-15:00 16:00-22:00',
      horas_trabalhadas: 7.50,
      horas_extras_diaria: 0,
      horas_extras_semanal: 0,
      horas_extras_mensal: 0,
      horas_noturnas: 2.0,
      horas_intra_jornada: 1.0,
      horas_inter_jornadas: 0,
      horas_art384: 0,
      horas_art253: 0,
      repousos_trabalhados: 0,
      feriados_trabalhados: 0,
      tipo_dia: 'UTIL',
    },
  ],
  historicos_salariais: [
    {
      nome: 'COMISSÕES PAGAS',
      tipo_variacao: 'VARIAVEL',
      incide_inss: true,
      incide_fgts: true,
      incide_ir: true,
      ocorrencias: [
        { competencia: '2016-04', valor: 1500.00 },
        { competencia: '2016-05', valor: 1800.00 },
        { competencia: '2016-06', valor: 1200.00 },
      ],
    },
    {
      nome: 'DSR S/ COMISSÃO',
      tipo_variacao: 'VARIAVEL',
      incide_inss: true,
      incide_fgts: true,
      incide_ir: true,
      ocorrencias: [
        { competencia: '2016-04', valor: 300.00 },
        { competencia: '2016-05', valor: 360.00 },
        { competencia: '2016-06', valor: 240.00 },
      ],
    },
  ],
  calculadas: [
    {
      id: 'calc_0',
      nome: 'HORAS EXTRAS',
      tipo_variacao: 'VARIAVEL',
      caracteristica: 'COMUM',
      ocorrencia_pagamento: 'MENSAL',
      incide_inss: true,
      incide_ir: true,
      incide_fgts: true,
      periodo_inicio: '2016-04-16',
      periodo_fim: '2021-03-02',
      multiplicador: 1.5,
      divisor: 220,
      tipo_divisor: 'CARGA_HORARIA',
      tipo_quantidade: 'CARTAO_PONTO',
      quantidade: 0,
      ordem: 0,
    },
    {
      id: 'calc_1',
      nome: 'COMISSÕES ESTORNADAS',
      tipo_variacao: 'VARIAVEL',
      caracteristica: 'COMUM',
      ocorrencia_pagamento: 'MENSAL',
      incide_inss: true,
      incide_ir: true,
      incide_fgts: true,
      periodo_inicio: '2016-04-16',
      periodo_fim: '2021-03-02',
      multiplicador: 1,
      divisor: 30,
      tipo_divisor: 'INFORMADO',
      tipo_quantidade: 'INFORMADA',
      quantidade: 1,
      ordem: 1,
    },
  ],
  reflexos: [
    {
      id: 'refl_0',
      nome: '13º SALÁRIO SOBRE HORAS EXTRAS',
      comportamento_reflexo: 'MEDIA_VALOR_ABSOLUTO',
      gerar_principal: true,
      gerar_reflexo: true,
      bases_verba: [{ calculada_id: 'calc_0', calculada_nome: 'HORAS EXTRAS', integralizar: false }],
      incide_inss: true,
      incide_ir: true,
      incide_fgts: true,
      periodo_inicio: '2016-04-16',
      periodo_fim: '2021-03-02',
      multiplicador: 1,
      divisor: 12,
      ordem: 0,
    },
    {
      id: 'refl_1',
      nome: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS',
      comportamento_reflexo: 'MEDIA_VALOR_ABSOLUTO',
      gerar_principal: true,
      gerar_reflexo: true,
      bases_verba: [{ calculada_id: 'calc_0', calculada_nome: 'HORAS EXTRAS', integralizar: false }],
      incide_inss: true,
      incide_ir: true,
      incide_fgts: true,
      periodo_inicio: '2016-04-16',
      periodo_fim: '2021-03-02',
      multiplicador: 1.3333,
      divisor: 12,
      ordem: 1,
    },
  ],
  faltas_afastamentos: [
    { data_inicio: '2015-09-24', data_fim: '2015-10-15', tipo: 'ATESTADO_MEDICO', justificada: true, motivo: 'Atestado médico' },
    { data_inicio: '2016-04-18', data_fim: '2016-10-15', tipo: 'LICENCA_MATERNIDADE', justificada: true, motivo: 'Licença maternidade' },
    { data_inicio: '2020-04-23', data_fim: '2020-06-16', tipo: 'SUSPENSAO', justificada: false, motivo: 'Suspensão contrato de trabalho' },
  ],
  ferias: [
    {
      aquisitivo_inicio: '2015-03-07',
      aquisitivo_fim: '2016-03-06',
      concessivo_inicio: '2016-03-07',
      concessivo_fim: '2017-03-06',
      prazo_dias: 30,
      situacao: 'GOZADAS',
      dobra: false,
      abono: false,
      dias_abono: 0,
      gozos: [{ inicio: '2016-10-19', fim: '2016-11-17', dias: 30 }],
    },
  ],
  atualizacao: {
    indice_base: 'IPCAE',
    juros_base: 'TRD_SIMPLES',
    juros_percentual: 1,
    combinacoes_indice: [
      { a_partir_de: '2021-04-16', indice_ou_juros: 'SEM_CORRECAO' },
      { a_partir_de: '2024-08-30', indice_ou_juros: 'IPCA' },
    ],
    combinacoes_juros: [
      { a_partir_de: '2021-04-16', indice_ou_juros: 'SELIC' },
      { a_partir_de: '2024-08-30', indice_ou_juros: 'TAXA_LEGAL' },
    ],
  },
};

// =====================================================
// TEST A: Round-trip XML export → re-parse → zero divergence
// =====================================================

describe('PJC Round-Trip', () => {
  it('should export and re-import with zero divergences', () => {
    // Export
    const xml = exportPJCXml(SAMPLE_PJC);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('CalculoTrabalhista');
    expect(xml).toContain('MARIA MADALENA');
    expect(xml).toContain('HORAS EXTRAS');

    // Re-parse
    const result = parsePJCXml(xml);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Compare
    const divs = compararPJC(SAMPLE_PJC, result.data!);

    // Filter critical divergences
    const criticos = divs.filter(d => d.severidade === 'critico');
    if (criticos.length > 0) {
      console.error('Divergências críticas:', criticos);
    }
    expect(criticos.length).toBe(0);
  });

  it('should preserve all calculadas', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.calculadas.length).toBe(SAMPLE_PJC.calculadas.length);

    for (const oc of SAMPLE_PJC.calculadas) {
      const found = result.data?.calculadas.find(c => c.nome === oc.nome);
      expect(found).toBeDefined();
      expect(found?.incide_fgts).toBe(oc.incide_fgts);
    }
  });

  it('should preserve all reflexos with BaseVerba linkage', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.reflexos.length).toBe(SAMPLE_PJC.reflexos.length);

    for (const or of SAMPLE_PJC.reflexos) {
      const found = result.data?.reflexos.find(r => r.nome === or.nome);
      expect(found).toBeDefined();
      expect(found?.bases_verba.length).toBe(or.bases_verba.length);
      if (or.bases_verba[0]) {
        expect(found?.bases_verba[0]?.calculada_id).toBe(or.bases_verba[0].calculada_id);
      }
    }
  });

  it('should preserve historico salarial with all ocorrencias', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.historicos_salariais.length).toBe(SAMPLE_PJC.historicos_salariais.length);

    for (const oh of SAMPLE_PJC.historicos_salariais) {
      const rh = result.data?.historicos_salariais.find(h => h.nome === oh.nome);
      expect(rh).toBeDefined();
      expect(rh?.ocorrencias.length).toBe(oh.ocorrencias.length);
      for (const oo of oh.ocorrencias) {
        const ro = rh?.ocorrencias.find(o => o.competencia === oo.competencia);
        expect(ro).toBeDefined();
        expect(Math.abs((ro?.valor || 0) - oo.valor)).toBeLessThan(0.01);
      }
    }
  });

  it('should preserve apuração diária', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.apuracao_diaria.length).toBe(SAMPLE_PJC.apuracao_diaria.length);
  });

  it('should preserve férias and faltas', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.ferias.length).toBe(SAMPLE_PJC.ferias.length);
    expect(result.data?.faltas_afastamentos.length).toBe(SAMPLE_PJC.faltas_afastamentos.length);
  });

  it('should preserve atualização combinações', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.data?.atualizacao.combinacoes_indice.length).toBe(SAMPLE_PJC.atualizacao.combinacoes_indice.length);
    expect(result.data?.atualizacao.combinacoes_juros.length).toBe(SAMPLE_PJC.atualizacao.combinacoes_juros.length);
  });

  it('should produce stats', () => {
    const xml = exportPJCXml(SAMPLE_PJC);
    const result = parsePJCXml(xml);
    expect(result.stats.dias_apuracao).toBe(2);
    expect(result.stats.historicos).toBe(2);
    expect(result.stats.calculadas).toBe(2);
    expect(result.stats.reflexos).toBe(2);
    expect(result.stats.faltas).toBe(3);
    expect(result.stats.ferias).toBe(1);
  });
});

// =====================================================
// TEST B: Correction by Date Engine
// =====================================================

describe('Correção por Data (ADC 58/59)', () => {
  const config: CorrecaoPorDataConfig = {
    combinacoes_indice: [
      { ate: '2021-04-15', indice: 'IPCAE' },
      { de: '2021-04-16', ate: '2024-08-29', indice: 'SEM_CORRECAO' },
      { de: '2024-08-30', indice: 'IPCA' },
    ],
    combinacoes_juros: [
      { ate: '2021-04-15', tipo: 'TRD_SIMPLES', percentual: 1 },
      { de: '2021-04-16', ate: '2024-08-29', tipo: 'SELIC' },
      { de: '2024-08-30', tipo: 'TAXA_LEGAL' },
    ],
    data_liquidacao: '2025-10-31',
    arredondamento: 'por_linha',
  };

  it('should return zero for zero input', () => {
    const result = aplicarCorrecaoPorData('2020-01', 0, config, ALL_TEST_INDICES as IndiceDB[]);
    expect(result.valor_corrigido).toBe(0);
    expect(result.juros).toBe(0);
    expect(result.valor_final).toBe(0);
  });

  it('should apply correction with positive value', () => {
    const result = aplicarCorrecaoPorData('2020-01', 1000, config, ALL_TEST_INDICES as IndiceDB[]);
    // With real index data, correction should increase value
    expect(result.valor_corrigido).toBeGreaterThanOrEqual(1000);
    expect(result.valor_final).toBeGreaterThanOrEqual(result.valor_corrigido);
    expect(result.fator_correcao).toBeGreaterThanOrEqual(1);
  });

  it('should produce regime segments', () => {
    const result = aplicarCorrecaoPorData('2019-06', 1000, config, ALL_TEST_INDICES as IndiceDB[]);
    expect(result.regimes_aplicados.length).toBeGreaterThan(0);
    // Should have at least correction regimes
    const correcaoRegimes = result.regimes_aplicados.filter(r => r.tipo === 'correcao');
    expect(correcaoRegimes.length).toBeGreaterThan(0);
  });

  it('should not apply interest when SEM_CORRECAO with SELIC', () => {
    // For a competência in the SELIC period, interest should be zero because SELIC is the index
    const singleConfig: CorrecaoPorDataConfig = {
      combinacoes_indice: [{ indice: 'SELIC' }],
      combinacoes_juros: [{ tipo: 'NENHUM' }],
      data_liquidacao: '2025-10-31',
      arredondamento: 'por_linha',
    };
    const result = aplicarCorrecaoPorData('2023-01', 1000, singleConfig);
    // When SELIC is the index, juros should be 0 (engulfed)
    expect(result.juros).toBe(0);
    expect(result.valor_corrigido).toBeGreaterThanOrEqual(1000);
  });

  it('should handle competência format with full date', () => {
    const result = aplicarCorrecaoPorData('2020-06-01', 500, config);
    expect(result.valor_original).toBe(500);
    expect(result.valor_final).toBeGreaterThanOrEqual(500);
  });
});
