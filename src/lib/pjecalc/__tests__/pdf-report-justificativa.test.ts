/**
 * Tests - pdf-report-justificativa
 *
 * Valida o relatorio explicativo (prosa) com 7 secoes:
 *   1. Cabecalho, 2. Correcao Monetaria, 3. Juros,
 *   4. INSS, 5. IR, 6. FGTS, 7. Memoria Resumida
 */
import { describe, it, expect } from 'vitest';
import {
  gerarRelatorioJustificativa,
  type JustificativaInput,
} from '../pdf-report-justificativa';
import type {
  PjeLiquidacaoResult,
  PjeCorrecaoConfig,
  PjeCSConfig,
  PjeIRConfig,
  PjeFGTSConfig,
} from '../engine-types';

function makeResultado(): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
    fgts: {
      depositos: [],
      total_depositos: 8000,
      multa_valor: 3200,
      lc110_10: 0,
      lc110_05: 0,
      saldo_deduzido: 0,
      total_fgts: 11200,
    },
    contribuicao_social: {
      segurado_devidos: [],
      segurado_pagos: [],
      empregador: [],
      total_segurado_devidos: 0,
      total_segurado_pagos: 0,
      total_segurado: 2500,
      total_empregador: 7500,
    },
    imposto_renda: {
      base_calculo: 0,
      deducoes: 0,
      base_tributavel: 0,
      imposto_devido: 0,
      meses_rra: 0,
      metodo: 'art_12a_rra',
      ir_anos_anteriores: 0,
      ir_ano_liquidacao: 0,
      ir_13_exclusivo: 0,
      ir_ferias_separado: 0,
      meses_anos_anteriores: 0,
      meses_ano_liquidacao: 0,
    },
    seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: false, cotas: [], total: 0 },
    resumo: {
      principal_bruto: 30000,
      principal_corrigido: 35000,
      juros_mora: 2500,
      fgts_total: 11200,
      cs_segurado: 2500,
      cs_empregador: 7500,
      ir_retido: 1200,
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: 0,
      multa_467: 0,
      honorarios_sucumbenciais: 0,
      honorarios_contratuais: 0,
      custas: 0,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: 31300,
      total_reclamada: 38800,
    },
  };
}

function baseCorrecao(): PjeCorrecaoConfig {
  return {
    indice: 'IPCAE',
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 0,
    data_liquidacao: '2025-06-15',
  };
}

function baseCS(): PjeCSConfig {
  return {
    apurar_segurado: true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'atividade',
    periodos_simples: [],
    com_correcao_trabalhista: false,
  };
}

function baseIR(): PjeIRConfig {
  return {
    apurar: true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: false,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: 0,
  };
}

function baseFGTS(): PjeFGTSConfig {
  return {
    apurar: true,
    destino: 'pagar_reclamante',
    compor_principal: true,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: 40,
    multa_base: 'devido',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
  };
}

function makeInput(overrides?: Partial<JustificativaInput>): JustificativaInput {
  return {
    resultado: makeResultado(),
    correcaoConfig: baseCorrecao(),
    csConfig: baseCS(),
    irConfig: baseIR(),
    fgtsConfig: baseFGTS(),
    processo: '0001-23.2024.5.02.0001',
    beneficiario: 'Joao da Silva',
    data_liquidacao: '2025-06-15',
    ...overrides,
  };
}

describe('gerarRelatorioJustificativa', () => {
  it('gera um Blob text/html nao-vazio e bem-formado', async () => {
    const blob = gerarRelatorioJustificativa(makeInput());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(blob.size).toBeGreaterThan(500);

    const text = await blob.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('</html>');
    expect(text).toContain('JUSTIFICATIVA E CRITERIO DE CALCULO');
  });

  it('inclui todas as 7 secoes (cabecalho, correcao, juros, INSS, IR, FGTS, memoria)', async () => {
    const blob = gerarRelatorioJustificativa(makeInput());
    const text = await blob.text();

    // Titulos numerados das 7 secoes
    expect(text).toMatch(/1\.\s*Identificacao do Calculo/);
    expect(text).toMatch(/2\.\s*Regime de Correcao Monetaria/);
    expect(text).toMatch(/3\.\s*Regime de Juros/);
    expect(text).toMatch(/4\.\s*Contribuicao Previdenciaria/);
    expect(text).toMatch(/5\.\s*Imposto de Renda/);
    expect(text).toMatch(/6\.\s*FGTS/);
    expect(text).toMatch(/7\.\s*Memoria de Calculo Resumida/);

    // Identificacao do processo e beneficiario
    expect(text).toContain('0001-23.2024.5.02.0001');
    expect(text).toContain('Joao da Silva');

    // Fundamentos juridicos essenciais
    expect(text).toContain('ADC 58');
    expect(text).toContain('113/2021');
    expect(text).toMatch(/Sumula n\.o 200/);
    expect(text).toContain('8.212/1991');
    expect(text).toContain('103/2019');
    expect(text).toContain('12-A');
    expect(text).toContain('7.713/1988');
    expect(text).toContain('8.036/1990');
    expect(text).toContain('110/2001');

    // Memoria resumida traz os totais
    expect(text).toContain('Principal Bruto');
    expect(text).toContain('Liquido Devido ao Reclamante');
    expect(text).toContain('Total Devido pelo Reclamado');
    expect(text).toContain('30.000,00'); // principal_bruto
    expect(text).toContain('31.300,00'); // liquido_reclamante
  });

  it('lista as combinacoes quando o regime de correcao usa COMBINACAO (ADC 58/59)', async () => {
    const correcao = baseCorrecao();
    correcao.combinacoes_indice = [
      { ate: '2021-12-08', indice: 'IPCAE' },
      { de: '2021-12-09', indice: 'SELIC' },
    ];
    correcao.combinacoes_juros = [
      { ate: '2021-12-08', tipo: 'TRD_SIMPLES', percentual: 1 },
      { de: '2021-12-09', tipo: 'SELIC' },
    ];
    const blob = gerarRelatorioJustificativa(
      makeInput({ correcaoConfig: correcao })
    );
    const text = await blob.text();

    // Secao de correcao lista fases em UL
    expect(text).toMatch(/Fases de correcao aplicadas/);
    expect(text).toContain('IPCA-E');
    expect(text).toContain('SELIC');
    expect(text).toContain('08/12/2021');
    expect(text).toContain('09/12/2021');

    // Secao de juros tambem lista fases
    expect(text).toMatch(/Fases de juros aplicadas/);
    expect(text).toMatch(/TRD Simples/);

    // Regime COMBINACAO sinalizado no texto
    expect(text).toMatch(/COMBINACAO/);
  });

  it('omite a deducao por dependentes e a deducao de aposentado 65+ quando nao configuradas', async () => {
    // Caso 1: sem dependentes e sem aposentado
    const ir = baseIR();
    ir.dependentes = 0;
    ir.aposentado_65 = false;
    const htmlSem = await gerarRelatorioJustificativa(
      makeInput({ irConfig: ir })
    ).text();
    expect(htmlSem).not.toContain('Deducao por dependentes');
    expect(htmlSem).not.toContain('aposentado 65+');

    // Caso 2: com ambos -> devem aparecer
    const ir2 = baseIR();
    ir2.dependentes = 2;
    ir2.aposentado_65 = true;
    const htmlCom = await gerarRelatorioJustificativa(
      makeInput({ irConfig: ir2 })
    ).text();
    expect(htmlCom).toContain('Deducao por dependentes');
    expect(htmlCom).toContain('2 dependente');
    expect(htmlCom).toContain('aposentado 65+');
  });

  it('reflete o toggle "com correcao trabalhista" e LC 110/2001 no texto explicativo', async () => {
    const cs = baseCS();
    cs.com_correcao_trabalhista = true;
    const fgts = baseFGTS();
    fgts.lc110_10 = true;
    fgts.lc110_05 = true;
    const text = await gerarRelatorioJustificativa(
      makeInput({ csConfig: cs, fgtsConfig: fgts })
    ).text();

    expect(text).toMatch(/correcao trabalhista:\s*<\/strong>\s*SIM/);
    expect(text).toMatch(/LC 110\/2001 - 10%:\s*<\/strong>\s*ATIVA/);
    expect(text).toMatch(/LC 110\/2001 - 0,5%:\s*<\/strong>\s*ATIVA/);
  });
});
