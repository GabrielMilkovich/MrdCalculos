/**
 * Tests - pdf-report-salario-familia
 *
 * Valida o Demonstrativo de Salario Familia:
 *   - Blob text/html valido
 *   - Cabecalho e secoes presentes
 *   - Valores formatados em pt-BR
 *   - Detalhes dos filhos quando fornecidos
 */
import { describe, it, expect } from 'vitest';
import {
  gerarRelatorioSalarioFamilia,
  buildRelatorioSalarioFamiliaHTML,
} from '../pdf-report-salario-familia';
import type { PjeLiquidacaoResult, PjeSalarioFamiliaConfig } from '../engine-types';

function makeResult(
  cotas: { competencia: string; filhos_elegíveis: number; valor_cota: number; total: number }[],
): PjeLiquidacaoResult {
  const total = cotas.reduce((acc, c) => acc + c.total, 0);
  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
    fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
    contribuicao_social: { segurado_devidos: [], segurado_pagos: [], empregador: [], total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 },
    imposto_renda: { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
    seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: true, cotas, total },
    resumo: {
      principal_bruto: 0, principal_corrigido: 0, juros_mora: 0, fgts_total: 0,
      cs_segurado: 0, cs_empregador: 0, ir_retido: 0, seguro_desemprego: 0,
      previdencia_privada: 0, salario_familia: total, multa_523: 0, multa_467: 0,
      honorarios_sucumbenciais: 0, honorarios_contratuais: 0, custas: 0,
      custas_detalhadas: [], pensao_sobre_fgts: 0, pensao_total: 0,
      contribuicao_sindical: 0, abono_pecuniario: 0, liquido_reclamante: 0,
      total_reclamada: 0,
    },
  };
}

describe('gerarRelatorioSalarioFamilia', () => {
  it('retorna Blob text/html nao vazio com DOCTYPE e titulo', async () => {
    const result = makeResult([
      { competencia: '2024-01-01', filhos_elegíveis: 2, valor_cota: 59.82, total: 119.64 },
    ]);
    const blob = gerarRelatorioSalarioFamilia(result, {
      cliente: 'Joao Silva',
      processo: '0001-23.2024.5.02.0001',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    const text = await blob.text();
    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('DEMONSTRATIVO DE SALARIO FAMILIA');
    expect(text).toContain('Joao Silva');
    expect(text).toContain('0001-23.2024.5.02.0001');
  });

  it('renderiza secoes obrigatorias (Parametros, Apuracao, Total, fundamento legal)', () => {
    const html = buildRelatorioSalarioFamiliaHTML(
      makeResult([
        { competencia: '2024-01-01', filhos_elegíveis: 1, valor_cota: 59.82, total: 59.82 },
        { competencia: '2024-02-01', filhos_elegíveis: 1, valor_cota: 59.82, total: 59.82 },
      ]),
      { cliente: 'Maria' },
    );
    expect(html).toContain('Parametros');
    expect(html).toContain('Apuracao por Competencia');
    expect(html).toContain('Total Salario Familia');
    expect(html).toMatch(/Lei\s*8\.213\/91/);
  });

  it('formata valores em pt-BR e soma total com Decimal.js', async () => {
    // 0.1 + 0.2 em float seria 0.30000000000000004 — com Decimal.js deve ser 0.30
    const cotas = [
      { competencia: '2024-01-01', filhos_elegíveis: 1, valor_cota: 0.1, total: 0.1 },
      { competencia: '2024-02-01', filhos_elegíveis: 1, valor_cota: 0.2, total: 0.2 },
      { competencia: '2024-03-01', filhos_elegíveis: 1, valor_cota: 100.55, total: 100.55 },
    ];
    const blob = gerarRelatorioSalarioFamilia(makeResult(cotas));
    const text = await blob.text();
    expect(text).toContain('100,55');
    expect(text).toContain('100,85');
  });

  it('exibe detalhes dos filhos quando salarioFamiliaConfig.filhos_detalhes e fornecido', () => {
    const cfg: PjeSalarioFamiliaConfig = {
      apurar: true,
      numero_filhos: 2,
      filhos_detalhes: [
        { nome: 'Ana', nascimento: '2015-04-10', ate_14: true },
        { nome: 'Bruno', nascimento: '2018-09-22', ate_14: true },
      ],
    };
    const html = buildRelatorioSalarioFamiliaHTML(
      makeResult([{ competencia: '2024-01-01', filhos_elegíveis: 2, valor_cota: 59.82, total: 119.64 }]),
      { salarioFamiliaConfig: cfg },
    );
    expect(html).toContain('Ana');
    expect(html).toContain('10/04/2015');
    expect(html).toContain('Bruno');
    expect(html).toContain('22/09/2018');
  });
});
