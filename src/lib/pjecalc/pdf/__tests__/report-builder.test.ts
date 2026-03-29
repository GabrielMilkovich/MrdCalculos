/**
 * Tests for the PDF Report Builder
 *
 * Validates that:
 * - buildMemoriaDeCalculo returns valid HTML
 * - All expected sections are present
 * - Currency values match the result
 * - Empty verbas do not crash
 * - Filename generation works correctly
 * - Totals in HTML match result.resumo
 */
import { describe, it, expect } from 'vitest';
import { buildMemoriaDeCalculo, buildResumo } from '../report-builder';
import { generateFilename } from '../download';
import { fmt } from '../formatter';
import type { PjeLiquidacaoResult, PjeParametros } from '../../engine-types';
import type { DadosProcesso } from '../types';

// ── Fixtures ──

function makeParams(overrides: Partial<PjeParametros> = {}): PjeParametros {
  return {
    case_id: 'test-case-001',
    data_admissao: '2020-01-01',
    data_demissao: '2023-12-31',
    data_ajuizamento: '2024-06-01',
    estado: 'SP',
    municipio: 'Sao Paulo',
    regime_trabalho: 'tempo_integral',
    carga_horaria_padrao: 220,
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    prazo_aviso_previo: 'calculado',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: true,
    sabado_dia_util: false,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    ...overrides,
  };
}

function makeDadosProcesso(overrides: Partial<DadosProcesso> = {}): DadosProcesso {
  return {
    processo: '0001234-56.2024.5.02.0001',
    cliente: 'Joao da Silva',
    reclamado: 'Empresa XYZ Ltda',
    vara: '1a Vara do Trabalho',
    perito: 'Dr. Perito',
    dataAdmissao: '2020-01-01',
    dataDemissao: '2023-12-31',
    dataAjuizamento: '2024-06-01',
    dataLiquidacao: '2024-12-15',
    uf: 'SP',
    municipio: 'Sao Paulo',
    ...overrides,
  };
}

function makeResult(overrides: Partial<PjeLiquidacaoResult> = {}): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2024-12-15',
    verbas: [
      {
        verba_id: 'v1',
        nome: 'Horas Extras 50%',
        tipo: 'principal',
        caracteristica: 'comum',
        ocorrencias: [
          {
            competencia: '2023-01',
            base: 3000,
            divisor: 220,
            multiplicador: 1.5,
            quantidade: 20,
            dobra: 1,
            devido: 409.09,
            pago: 0,
            diferenca: 409.09,
            indice_correcao: 1.0523,
            valor_corrigido: 430.48,
            juros: 43.05,
            valor_final: 473.53,
            formula: '(3000 * 1.5 / 220) * 20',
          },
        ],
        total_devido: 409.09,
        total_pago: 0,
        total_diferenca: 409.09,
        total_corrigido: 430.48,
        total_juros: 43.05,
        total_final: 473.53,
      },
      {
        verba_id: 'v2',
        nome: 'RSR sobre HE 50%',
        tipo: 'reflexa',
        caracteristica: 'comum',
        ocorrencias: [],
        total_devido: 68.18,
        total_pago: 0,
        total_diferenca: 68.18,
        total_corrigido: 71.75,
        total_juros: 7.18,
        total_final: 78.93,
      },
    ],
    fgts: {
      depositos: [
        { competencia: '2023-01', base: 477.27, aliquota: 0.08, valor: 38.18 },
      ],
      total_depositos: 38.18,
      multa_valor: 15.27,
      lc110_10: 0,
      lc110_05: 0,
      saldo_deduzido: 0,
      total_fgts: 53.45,
    },
    contribuicao_social: {
      segurado_devidos: [
        { competencia: '2023-01', base: 477.27, aliquota: 0.075, valor: 35.80, recolhido: 0, diferenca: 35.80 },
      ],
      segurado_pagos: [],
      empregador: [
        { competencia: '2023-01', empresa: 95.45, sat: 9.55, terceiros: 27.68 },
      ],
      total_segurado_devidos: 35.80,
      total_segurado_pagos: 0,
      total_segurado: 35.80,
      total_empregador: 132.68,
    },
    imposto_renda: {
      base_calculo: 552.46,
      deducoes: 35.80,
      base_tributavel: 516.66,
      imposto_devido: 0,
      meses_rra: 12,
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
      principal_bruto: 477.27,
      principal_corrigido: 502.23,
      juros_mora: 50.23,
      fgts_total: 53.45,
      cs_segurado: 35.80,
      cs_empregador: 132.68,
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
      liquido_reclamante: 570.11,
      total_reclamada: 702.79,
    },
    ...overrides,
  };
}

// ── Tests ──

describe('buildMemoriaDeCalculo', () => {
  it('returns valid HTML document', () => {
    const html = buildMemoriaDeCalculo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('</html>');
  });

  it('contains all major sections', () => {
    const html = buildMemoriaDeCalculo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).toContain('section-header-summary');
    expect(html).toContain('section-calculation-data');
    expect(html).toContain('section-verbas-detail');
    expect(html).toContain('section-fgts-detail');
    expect(html).toContain('section-inss-detail');
    expect(html).toContain('section-totals');
  });

  it('contains process identification', () => {
    const html = buildMemoriaDeCalculo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).toContain('0001234-56.2024.5.02.0001');
    expect(html).toContain('Joao da Silva');
    expect(html).toContain('Empresa XYZ Ltda');
  });

  it('contains currency values matching result.resumo', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    // Check that liquido_reclamante appears formatted
    expect(html).toContain(fmt.decimal(result.resumo.liquido_reclamante));
    // Check total_reclamada appears
    expect(html).toContain(fmt.decimal(result.resumo.total_reclamada));
    // Check principal bruto appears
    expect(html).toContain(fmt.decimal(result.resumo.principal_bruto));
  });

  it('contains verba names and occurrence data', () => {
    const html = buildMemoriaDeCalculo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).toContain('Horas Extras 50%');
    expect(html).toContain('RSR sobre HE 50%');
    // Check an occurrence value
    expect(html).toContain(fmt.decimal(409.09));
  });

  it('contains FGTS detail with correct total', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    expect(html).toContain('FGTS');
    expect(html).toContain(fmt.decimal(result.fgts.total_fgts));
    expect(html).toContain(fmt.decimal(result.fgts.total_depositos));
  });

  it('contains INSS detail', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    expect(html).toContain('Contribuicao Social');
    expect(html).toContain(fmt.decimal(result.contribuicao_social.total_segurado));
  });

  it('does not contain IR section when imposto_devido is 0', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    // IR section should not be visible since imposto_devido = 0
    expect(html).not.toContain('section-ir-detail');
  });

  it('contains IR section when imposto_devido > 0', () => {
    const result = makeResult({
      imposto_renda: {
        base_calculo: 10000,
        deducoes: 500,
        base_tributavel: 9500,
        imposto_devido: 1200,
        meses_rra: 24,
        metodo: 'art_12a_rra',
        ir_anos_anteriores: 800,
        ir_ano_liquidacao: 400,
        ir_13_exclusivo: 0,
        ir_ferias_separado: 0,
        meses_anos_anteriores: 12,
        meses_ano_liquidacao: 12,
      },
      resumo: {
        ...makeResult().resumo,
        ir_retido: 1200,
      },
    });
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    expect(html).toContain('section-ir-detail');
    expect(html).toContain('Imposto de Renda');
    expect(html).toContain(fmt.decimal(1200));
  });
});

describe('buildMemoriaDeCalculo - edge cases', () => {
  it('handles empty verbas without crashing', () => {
    const result = makeResult({
      verbas: [],
      fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
      contribuicao_social: {
        segurado_devidos: [], segurado_pagos: [], empregador: [],
        total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0,
      },
      resumo: {
        ...makeResult().resumo,
        principal_bruto: 0,
        principal_corrigido: 0,
        juros_mora: 0,
        fgts_total: 0,
        cs_segurado: 0,
        cs_empregador: 0,
        liquido_reclamante: 0,
        total_reclamada: 0,
      },
    });
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Nenhuma verba calculada');
  });

  it('handles null params gracefully', () => {
    const html = buildMemoriaDeCalculo(makeResult(), null, makeDadosProcesso());
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('handles minimal dadosProcesso', () => {
    const html = buildMemoriaDeCalculo(makeResult(), makeParams(), {});
    expect(html).toContain('<!DOCTYPE html>');
  });
});

describe('buildResumo', () => {
  it('returns valid HTML with summary section', () => {
    const html = buildResumo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('section-header-summary');
    expect(html).toContain('section-totals');
  });

  it('does not contain verba detail section', () => {
    const html = buildResumo(makeResult(), makeParams(), makeDadosProcesso());
    expect(html).not.toContain('section-verbas-detail');
  });
});

describe('generateFilename', () => {
  it('generates filename with all parts', () => {
    const name = generateFilename('Memoria', '1234567', '2024-06-15');
    expect(name).toBe('MRD_CALC_Memoria_1234567_2024-06-15.html');
  });

  it('generates filename without processo', () => {
    const name = generateFilename('Resumo', undefined, '2024-06-15');
    expect(name).toBe('MRD_CALC_Resumo_2024-06-15.html');
  });

  it('sanitizes special characters in processo', () => {
    const name = generateFilename('Memoria', '0001-23/2024.5.02', '2024-01-01');
    expect(name).toBe('MRD_CALC_Memoria_0001-23_2024.5.02_2024-01-01.html');
  });

  it('uses today date when not provided', () => {
    const name = generateFilename('Memoria');
    expect(name).toMatch(/^MRD_CALC_Memoria_\d{4}-\d{2}-\d{2}\.html$/);
  });
});

describe('fmt (formatter)', () => {
  it('formats currency correctly', () => {
    expect(fmt.currency(1234.56)).toContain('1.234,56');
  });

  it('formats zero currency', () => {
    expect(fmt.currency(0)).toContain('0,00');
  });

  it('formats date correctly', () => {
    expect(fmt.date('2024-01-15')).toBe('15/01/2024');
  });

  it('returns em dash for null date', () => {
    expect(fmt.date(null)).toBe('\u2014');
    expect(fmt.date(undefined)).toBe('\u2014');
  });

  it('formats competencia correctly', () => {
    expect(fmt.competencia('2024-01')).toBe('jan/2024');
    expect(fmt.competencia('2024-12-01')).toBe('dez/2024');
  });

  it('formats competenciaShort correctly', () => {
    expect(fmt.competenciaShort('2024-06')).toBe('06/2024');
  });

  it('formats percent correctly', () => {
    expect(fmt.percent(8)).toBe('8.00%');
  });

  it('formats index (4 decimals) correctly', () => {
    expect(fmt.index(1.0523)).toContain('0523');
  });
});

describe('totals match result.resumo', () => {
  it('liquido_reclamante in HTML matches resumo', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    const formattedLiquido = fmt.decimal(result.resumo.liquido_reclamante);
    // Count occurrences - should appear in summary, credits, and totals
    const count = (html.match(new RegExp(formattedLiquido.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(count).toBeGreaterThanOrEqual(3); // summary table, credits section, totals
  });

  it('total_reclamada in HTML matches resumo', () => {
    const result = makeResult();
    const html = buildMemoriaDeCalculo(result, makeParams(), makeDadosProcesso());
    const formattedTotal = fmt.decimal(result.resumo.total_reclamada);
    const count = (html.match(new RegExp(formattedTotal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
