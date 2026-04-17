/**
 * Tests - pdf-report-consolidado (Completo)
 *
 * Cobre:
 *  - agregarTotais com Decimal.js (precisão 20)
 *  - breakdownComponentes por cálculo
 *  - analisarTendencia (temporal ou não)
 *  - buildConsolidadoCompletoHTML: seções, totais, tendência
 *  - gerarRelatorioConsolidadoCompleto: Blob não-vazio, erros
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  agregarTotais,
  breakdownComponentes,
  analisarTendencia,
  buildConsolidadoCompletoHTML,
  gerarRelatorioConsolidadoCompleto,
  type CalculoConsolidado,
} from '../pdf-report-consolidado';
import type { PjeLiquidacaoResult } from '../engine-types';

function makeResult(overrides?: Partial<PjeLiquidacaoResult['resumo']> & {
  multa_fgts?: number;
}): PjeLiquidacaoResult {
  const { multa_fgts = 0, ...resumoOver } = overrides ?? {};
  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
    fgts: {
      depositos: [],
      total_depositos: 8000,
      multa_valor: multa_fgts,
      lc110_10: 0,
      lc110_05: 0,
      saldo_deduzido: 0,
      total_fgts: 8000 + multa_fgts,
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
      principal_bruto: 10000,
      principal_corrigido: 11000,
      juros_mora: 500,
      fgts_total: 8000,
      cs_segurado: 1100,
      cs_empregador: 3300,
      ir_retido: 700,
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
      liquido_reclamante: 17700,
      total_reclamada: 25000,
      ...resumoOver,
    },
  };
}

function makeCalculo(
  id: string,
  nome: string,
  dataLiquidacao: string,
  overrides?: Partial<PjeLiquidacaoResult['resumo']> & { multa_fgts?: number },
): CalculoConsolidado {
  return { id, nome, dataLiquidacao, resultado: makeResult(overrides) };
}

describe('agregarTotais', () => {
  it('soma componentes de múltiplos cálculos com Decimal.js', () => {
    const calcs = [
      makeCalculo('a', 'A', '2025-01-01', { principal_bruto: 1000, juros_mora: 100, multa_fgts: 500 }),
      makeCalculo('b', 'B', '2025-02-01', { principal_bruto: 2500, juros_mora: 250, multa_fgts: 750 }),
      makeCalculo('c', 'C', '2025-03-01', { principal_bruto: 3500.33, juros_mora: 125.67, multa_fgts: 0 }),
    ];
    const t = agregarTotais(calcs);
    expect(t.principal_bruto).toBeInstanceOf(Decimal);
    expect(t.principal_bruto.toFixed(2)).toBe('7000.33');
    expect(t.juros_mora.toFixed(2)).toBe('475.67');
    expect(t.fgts_multa.toFixed(2)).toBe('1250.00');
  });

  it('retorna zeros (Decimal) quando lista está vazia', () => {
    const t = agregarTotais([]);
    expect(t.principal_bruto.isZero()).toBe(true);
    expect(t.liquido_reclamante.isZero()).toBe(true);
    expect(t.total_reclamada.isZero()).toBe(true);
  });
});

describe('breakdownComponentes', () => {
  it('expõe principal, correção, juros, FGTS, CS e IR', () => {
    const r = makeResult({
      principal_bruto: 10000,
      principal_corrigido: 11500,
      juros_mora: 300,
      fgts_total: 2000,
      cs_segurado: 800,
      ir_retido: 500,
      multa_fgts: 1200,
    });
    const b = breakdownComponentes(r);
    expect(b.principal).toBe(10000);
    expect(b.correcao).toBe(1500);
    expect(b.juros).toBe(300);
    expect(b.fgts).toBe(2000);
    expect(b.cs).toBe(800);
    expect(b.ir).toBe(500);
    expect(b.multa_fgts).toBe(1200);
  });
});

describe('analisarTendencia', () => {
  it('retorna temporal=false quando há menos de 2 cálculos', () => {
    const t = analisarTendencia([makeCalculo('a', 'A', '2025-01-01')]);
    expect(t.temporal).toBe(false);
    expect(t.delta_liquido.isZero()).toBe(true);
  });

  it('retorna temporal=false quando todas as datas são idênticas', () => {
    const t = analisarTendencia([
      makeCalculo('a', 'A', '2025-01-01'),
      makeCalculo('b', 'B', '2025-01-01'),
    ]);
    expect(t.temporal).toBe(false);
  });

  it('ordena cronologicamente e calcula delta entre primeiro e último', () => {
    const t = analisarTendencia([
      makeCalculo('c', 'C', '2025-03-01', { liquido_reclamante: 30000, total_reclamada: 40000 }),
      makeCalculo('a', 'A', '2025-01-01', { liquido_reclamante: 10000, total_reclamada: 15000 }),
      makeCalculo('b', 'B', '2025-02-01', { liquido_reclamante: 20000, total_reclamada: 25000 }),
    ]);
    expect(t.temporal).toBe(true);
    expect(t.primeiro?.id).toBe('a');
    expect(t.ultimo?.id).toBe('c');
    expect(t.delta_liquido.toNumber()).toBe(20000);
    expect(t.delta_total.toNumber()).toBe(25000);
    expect(t.delta_percent.toNumber()).toBe(200);
    // jan 1 -> mar 1 = 59 dias
    expect(t.dias_entre).toBe(59);
  });
});

describe('buildConsolidadoCompletoHTML', () => {
  const calcs = [
    makeCalculo('a', 'Fulano', '2025-01-10', {
      principal_bruto: 10000,
      principal_corrigido: 11000,
      juros_mora: 500,
      liquido_reclamante: 9200,
      total_reclamada: 14000,
      multa_fgts: 400,
    }),
    makeCalculo('b', 'Beltrano', '2025-03-20', {
      principal_bruto: 20000,
      principal_corrigido: 22000,
      juros_mora: 1000,
      liquido_reclamante: 18400,
      total_reclamada: 28000,
      multa_fgts: 800,
    }),
  ];

  it('contém as 4 seções esperadas e o TOTAL CONSOLIDADO', () => {
    const html = buildConsolidadoCompletoHTML(calcs, {
      processo: '0001-23.2024.5.02.0001',
      cliente: 'Fulano de Tal',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('RELATÓRIO CONSOLIDADO COMPLETO');
    expect(html).toContain('0001-23.2024.5.02.0001');
    expect(html).toContain('1. Comparativo Lado-a-Lado');
    expect(html).toContain('2. Proporções por Tipo de Verba/Desconto');
    expect(html).toContain('3. Breakdown por Componente');
    expect(html).toContain('4. Análise de Tendência Temporal');
    expect(html).toContain('TOTAL CONSOLIDADO');
    expect(html).toContain('Fulano');
    expect(html).toContain('Beltrano');
  });

  it('mostra tendência não-aplicável para cálculo único', () => {
    const html = buildConsolidadoCompletoHTML([calcs[0]]);
    expect(html).toContain('Tendência não aplicável');
  });

  it('formata valores monetários em pt-BR (separador brasileiro)', () => {
    const html = buildConsolidadoCompletoHTML(calcs);
    // 10000 + 20000 = 30.000,00 (principal_bruto)
    expect(html).toContain('30.000,00');
    // 27.600,00 = soma dos líquidos (9200 + 18400)
    expect(html).toContain('27.600,00');
  });
});

describe('gerarRelatorioConsolidadoCompleto', () => {
  it('retorna Blob text/html não-vazio', async () => {
    const blob = gerarRelatorioConsolidadoCompleto([
      makeCalculo('a', 'A', '2025-01-01'),
      makeCalculo('b', 'B', '2025-02-01'),
    ]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(blob.size).toBeGreaterThan(500);
    const text = await blob.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('</html>');
  });

  it('lança erro quando lista está vazia', () => {
    expect(() => gerarRelatorioConsolidadoCompleto([])).toThrowError(/Nenhum cálculo/);
  });
});
