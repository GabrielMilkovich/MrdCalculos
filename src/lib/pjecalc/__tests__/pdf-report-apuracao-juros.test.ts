/**
 * Tests — pdf-report-apuracao-juros
 *
 * Valida o relatorio detalhado de Apuracao de Juros por competencia:
 *  - Geracao de Blob HTML valido
 *  - Cabecalho com processo/beneficiario/datas/regime
 *  - Tabela por competencia (verbas + ocorrencias)
 *  - Secao de combinacoes de juros (ADC 58/59, EC 113/2021)
 *  - Totalizadores (meses, juros, por tipo de verba) com Decimal.js
 *  - Metodologia (Sumula 200 TST)
 */
import { describe, it, expect } from 'vitest';
import { gerarRelatorioApuracaoJuros, buildApuracaoJurosHTML } from '../pdf-report-apuracao-juros';
import type {
  PjeLiquidacaoResult,
  PjeCorrecaoConfig,
  PjeVerbaResult,
  PjeOcorrenciaResult,
} from '../engine-types';

function makeOc(
  competencia: string,
  diferenca: number,
  juros: number,
  extra?: Partial<PjeOcorrenciaResult>,
): PjeOcorrenciaResult {
  return {
    competencia,
    base: 1000,
    divisor: 1,
    multiplicador: 1,
    quantidade: 1,
    dobra: 1,
    devido: diferenca + 500,
    pago: 500,
    diferenca,
    indice_correcao: 1,
    valor_corrigido: diferenca,
    juros,
    valor_final: diferenca + juros,
    formula: 'teste',
    ...extra,
  };
}

function makeVerba(
  id: string,
  nome: string,
  tipo: string,
  ocorrencias: PjeOcorrenciaResult[],
): PjeVerbaResult {
  const diff = ocorrencias.reduce((s, o) => s + o.diferenca, 0);
  const juros = ocorrencias.reduce((s, o) => s + o.juros, 0);
  return {
    verba_id: id,
    nome,
    tipo,
    caracteristica: '',
    ocorrencias,
    total_devido: ocorrencias.reduce((s, o) => s + o.devido, 0),
    total_pago: ocorrencias.reduce((s, o) => s + o.pago, 0),
    total_diferenca: diff,
    total_corrigido: diff,
    total_juros: juros,
    total_final: diff + juros,
  };
}

function makeResultado(verbas: PjeVerbaResult[], jurosMora = 0): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2025-06-15',
    verbas,
    fgts: {
      depositos: [],
      total_depositos: 0,
      multa_valor: 0,
      lc110_10: 0,
      lc110_05: 0,
      saldo_deduzido: 0,
      total_fgts: 0,
    },
    contribuicao_social: {
      segurado_devidos: [],
      segurado_pagos: [],
      empregador: [],
      total_segurado_devidos: 0,
      total_segurado_pagos: 0,
      total_segurado: 0,
      total_empregador: 0,
    },
    imposto_renda: {
      base_calculo: 0,
      deducoes: 0,
      base_tributavel: 0,
      imposto_devido: 0,
      meses_rra: 0,
      metodo: 'tabela_mensal',
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
      principal_bruto: 0,
      principal_corrigido: 0,
      juros_mora: jurosMora,
      fgts_total: 0,
      cs_segurado: 0,
      cs_empregador: 0,
      ir_retido: 0,
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
      liquido_reclamante: 0,
      total_reclamada: 0,
    },
  };
}

function makeConfig(overrides?: Partial<PjeCorrecaoConfig>): PjeCorrecaoConfig {
  return {
    indice: 'IPCAE',
    epoca: 'mensal',
    juros_tipo: 'selic',
    juros_percentual: 1,
    juros_inicio: 'ajuizamento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: '2025-06-15',
    ...overrides,
  };
}

describe('gerarRelatorioApuracaoJuros', () => {
  it('retorna Blob text/html valido com DOCTYPE e titulo', async () => {
    const verba = makeVerba('v1', 'Horas Extras', 'principal', [
      makeOc('2024-01-01', 1000, 100),
    ]);
    const blob = gerarRelatorioApuracaoJuros({
      resultado: makeResultado([verba], 100),
      correcaoConfig: makeConfig(),
      data_ajuizamento: '2024-06-01',
      data_liquidacao: '2025-06-15',
      processo: '0001-23.2024.5.02.0001',
      beneficiario: 'Joao da Silva',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    const text = await blob.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('</html>');
    expect(text).toContain('RELATORIO DE APURACAO DE JUROS');
    // Cabecalho
    expect(text).toContain('0001-23.2024.5.02.0001');
    expect(text).toContain('Joao da Silva');
    // Datas formatadas pt-BR
    expect(text).toContain('01/06/2024');
    expect(text).toContain('15/06/2025');
  });

  it('renderiza tabela por competencia com verbas e subtotais', () => {
    const verbaA = makeVerba('v1', 'Horas Extras', 'principal', [
      makeOc('2023-03-01', 500, 50),
      makeOc('2023-04-01', 500, 45),
    ]);
    const verbaB = makeVerba('v2', 'DSR sobre Horas Extras', 'reflexa', [
      makeOc('2023-03-01', 100, 10),
    ]);
    const html = buildApuracaoJurosHTML({
      resultado: makeResultado([verbaA, verbaB], 105),
      correcaoConfig: makeConfig(),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2025-06-15',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    // Agrupamento por verba
    expect(html).toContain('HORAS EXTRAS');
    expect(html).toContain('DSR SOBRE HORAS EXTRAS');
    // Ocorrencias
    expect(html).toContain('2023-03-01');
    expect(html).toContain('2023-04-01');
    // Subtotal e Total Geral
    expect(html).toMatch(/Subtotal/);
    expect(html).toContain('TOTAL GERAL');
    // Valores formatados pt-BR
    expect(html).toContain('1.000,00'); // subtotal verbaA diferenca
    expect(html).toContain('95,00'); // subtotal verbaA juros 50+45
  });

  it('renderiza secao de combinacoes quando configuradas (ADC 58/59)', () => {
    const verba = makeVerba('v1', 'Salario', 'principal', [
      makeOc('2024-01-01', 1000, 50),
    ]);
    const html = buildApuracaoJurosHTML({
      resultado: makeResultado([verba], 50),
      correcaoConfig: makeConfig({
        combinacoes_juros: [
          { ate: '2021-12-08', tipo: 'TRD_SIMPLES' },
          { de: '2021-12-09', tipo: 'SELIC' },
        ],
      }),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2025-06-15',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    expect(html).toContain('Combinacoes de Juros Aplicadas');
    expect(html).toContain('TRD (simples)');
    expect(html).toContain('SELIC');
    expect(html).toContain('08/12/2021');
    expect(html).toContain('09/12/2021');
    expect(html).toContain('ADC 58/59');
    expect(html).toContain('EC 113/2021');
    // Regime resumo no cabecalho reflete as combinacoes
    expect(html).toMatch(/Combinado por data/);
  });

  it('OMITE secao de combinacoes quando lista vazia', () => {
    const verba = makeVerba('v1', 'Salario', 'principal', [
      makeOc('2024-01-01', 500, 25),
    ]);
    const html = buildApuracaoJurosHTML({
      resultado: makeResultado([verba], 25),
      correcaoConfig: makeConfig({ combinacoes_juros: [] }),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2024-12-01',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    expect(html).not.toMatch(/<h2>[^<]*Combinacoes de Juros Aplicadas[^<]*<\/h2>/);
  });

  it('calcula totalizadores com precisao Decimal.js (sem drift de float)', async () => {
    // 0.1 + 0.2 = 0.30000000000000004 em float; Decimal produz 0.30 exato
    const verba = makeVerba('v1', 'Salario', 'principal', [
      makeOc('2024-01-01', 1, 0.1),
      makeOc('2024-02-01', 1, 0.2),
      makeOc('2024-03-01', 1, 0.7),
    ]);
    const blob = gerarRelatorioApuracaoJuros({
      resultado: makeResultado([verba], 1.0),
      correcaoConfig: makeConfig(),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2024-12-15',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    const html = await blob.text();
    expect(html).toContain('Totalizadores');
    // Soma exata 1.00 aparece formatada
    expect(html).toContain('1,00');
    // Nao aparece string de drift 0,30000000000000004
    expect(html).not.toContain('0,30000000000000004');
    // Total de meses = (dez-jan) + (dez-fev) + (dez-mar) = 11+10+9 = 30
    expect(html).toMatch(/Total de meses computados[\s\S]*?30/);
    // Total de ocorrencias = 3
    expect(html).toMatch(/Total de ocorrencias[\s\S]*?3/);
  });

  it('inclui secao de Metodologia com Sumula 200 TST', async () => {
    const verba = makeVerba('v1', 'Salario', 'principal', [
      makeOc('2024-01-01', 1000, 100),
    ]);
    const blob = gerarRelatorioApuracaoJuros({
      resultado: makeResultado([verba], 100),
      correcaoConfig: makeConfig(),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2025-01-01',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    const html = await blob.text();
    expect(html).toContain('Metodologia');
    expect(html).toContain('Sumula 200');
    expect(html).toContain('DIFERENCA');
  });

  it('mensagem amigavel quando nao ha ocorrencias com diferenca/juros', async () => {
    const verba = makeVerba('v1', 'Salario', 'principal', [
      makeOc('2024-01-01', 0, 0),
    ]);
    const blob = gerarRelatorioApuracaoJuros({
      resultado: makeResultado([verba], 0),
      correcaoConfig: makeConfig(),
      data_ajuizamento: '2024-01-01',
      data_liquidacao: '2024-12-01',
      processo: 'P1',
      beneficiario: 'Teste',
    });
    const html = await blob.text();
    expect(html).toContain('Nenhuma ocorrencia');
    // Nao deve quebrar; continua incluindo Totalizadores e Metodologia
    expect(html).toContain('Totalizadores');
    expect(html).toContain('Metodologia');
  });
});
