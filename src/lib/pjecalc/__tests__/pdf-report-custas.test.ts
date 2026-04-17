/**
 * Tests — pdf-report-custas
 *
 * Valida o relatorio detalhado de custas com 5 secoes (judiciais, periciais,
 * emolumentos, postais, outras):
 *  - Geracao de Blob HTML valido
 *  - Presenca de todas as secoes quando ha itens
 *  - Secoes sem itens sao OMITIDAS
 *  - Total geral correto (com precisao Decimal.js)
 *  - Subtotais por secao corretos
 *  - Filtro por tipo esta correto (itens de um tipo nao aparecem em outro)
 *  - Configuracao opcional (percentual, valor_fixo) aparece no HTML
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  gerarRelatorioCustasDetalhado,
  buildRelatorioCustasHTML,
  calcularSubtotaisCustas,
} from '../pdf-report-custas';
import type { PjeLiquidacaoResult, PjeCustaResult, PjeCustasConfig } from '../engine-types';

function makeResumo(custasDetalhadas: PjeCustaResult[], totalCustas?: number): PjeLiquidacaoResult {
  const total =
    totalCustas ??
    custasDetalhadas.reduce(
      (acc, c) => acc.plus(new Decimal(c.valor)),
      new Decimal(0)
    ).toDecimalPlaces(2).toNumber();

  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
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
      juros_mora: 0,
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
      custas: total,
      custas_detalhadas: custasDetalhadas,
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: 0,
      total_reclamada: total,
    },
  };
}

describe('gerarRelatorioCustasDetalhado', () => {
  it('retorna Blob text/html valido com DOCTYPE', async () => {
    const result = makeResumo([
      { tipo: 'judiciais', descricao: 'Custas de Conhecimento', valor: 120.5 },
    ]);
    const blob = gerarRelatorioCustasDetalhado(result, { processo: '0001-23.2024.5.02.0001' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    const text = await blob.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('</html>');
    expect(text).toContain('RELATORIO DETALHADO DE CUSTAS');
  });

  it('inclui as 5 secoes quando ha itens em cada tipo', () => {
    const itens: PjeCustaResult[] = [
      { tipo: 'judiciais', descricao: 'Conhecimento 2%', valor: 100 },
      { tipo: 'periciais', descricao: 'Honorarios Pericia Contabil', valor: 1500 },
      { tipo: 'emolumentos', descricao: 'Emolumento Cartorial', valor: 45.3 },
      { tipo: 'postais', descricao: 'AR / Postagem', valor: 12.75 },
      { tipo: 'outras', descricao: 'Custas Adicionais', valor: 80 },
    ];
    const html = buildRelatorioCustasHTML(makeResumo(itens));
    expect(html).toContain('Custas Judiciais');
    expect(html).toContain('Custas Periciais');
    expect(html).toContain('Emolumentos');
    expect(html).toContain('Custas Postais');
    expect(html).toContain('Outras Custas');
    // Descricoes aparecem
    expect(html).toContain('Conhecimento 2%');
    expect(html).toContain('Honorarios Pericia Contabil');
    expect(html).toContain('Emolumento Cartorial');
    expect(html).toContain('AR / Postagem');
    expect(html).toContain('Custas Adicionais');
  });

  it('OMITE secoes sem itens', () => {
    const html = buildRelatorioCustasHTML(
      makeResumo([
        { tipo: 'judiciais', descricao: 'Conhecimento 2%', valor: 100 },
        { tipo: 'postais', descricao: 'AR', valor: 10 },
      ])
    );
    expect(html).toContain('Custas Judiciais');
    expect(html).toContain('Custas Postais');
    // Secoes sem itens NAO aparecem como titulo <h2>
    expect(html).not.toMatch(/<h2>[^<]*Custas Periciais[^<]*<\/h2>/);
    expect(html).not.toMatch(/<h2>[^<]*Emolumentos[^<]*<\/h2>/);
    expect(html).not.toMatch(/<h2>[^<]*Outras Custas[^<]*<\/h2>/);
  });

  it('calcula total geral correto usando Decimal.js (sem erro de ponto flutuante)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 em float; com Decimal deve ser 0.30
    const itens: PjeCustaResult[] = [
      { tipo: 'judiciais', descricao: 'X', valor: 0.1 },
      { tipo: 'periciais', descricao: 'Y', valor: 0.2 },
      { tipo: 'postais', descricao: 'Z', valor: 10.55 },
      { tipo: 'outras', descricao: 'W', valor: 89.45 },
    ];
    const subtotais = calcularSubtotaisCustas(makeResumo(itens));
    const map = Object.fromEntries(subtotais.map((s) => [s.tipo, s.subtotal]));
    expect(map['judiciais']).toBe(0.1);
    expect(map['periciais']).toBe(0.2);
    expect(map['postais']).toBe(10.55);
    expect(map['outras']).toBe(89.45);
    expect(map['emolumentos']).toBe(0);
    // Total geral = 100.30 (0.10 + 0.20 + 10.55 + 89.45)
    const total = subtotais.reduce(
      (acc, s) => acc.plus(new Decimal(s.subtotal)),
      new Decimal(0)
    );
    expect(total.toDecimalPlaces(2).toNumber()).toBe(100.3);

    // Total geral aparece no HTML formatado pt-BR
    const html = buildRelatorioCustasHTML(makeResumo(itens));
    expect(html).toMatch(/Total Geral de Custas/i);
    expect(html).toContain('100,30');
  });

  it('subtotal por secao bate com a soma dos itens', () => {
    const itens: PjeCustaResult[] = [
      { tipo: 'judiciais', descricao: 'A', valor: 10 },
      { tipo: 'judiciais', descricao: 'B', valor: 20 },
      { tipo: 'judiciais', descricao: 'C', valor: 30 },
      { tipo: 'periciais', descricao: 'D', valor: 1500.75 },
    ];
    const subtotais = calcularSubtotaisCustas(makeResumo(itens));
    const jud = subtotais.find((s) => s.tipo === 'judiciais');
    const per = subtotais.find((s) => s.tipo === 'periciais');
    expect(jud?.subtotal).toBe(60);
    expect(jud?.quantidade).toBe(3);
    expect(per?.subtotal).toBe(1500.75);
    expect(per?.quantidade).toBe(1);

    const html = buildRelatorioCustasHTML(makeResumo(itens));
    expect(html).toContain('60,00');
    expect(html).toContain('1.500,75');
  });

  it('renderiza percentual e valor_fixo quando fornecidos em custasConfig', () => {
    const itens: PjeCustaResult[] = [
      { tipo: 'judiciais', descricao: 'Conhecimento 2%', valor: 200 },
      { tipo: 'outras', descricao: 'Taxa Fixa', valor: 50 },
    ];
    const custasConfig: PjeCustasConfig = {
      apurar: true,
      percentual: 2,
      valor_minimo: 0,
      isento: false,
      assistencia_judiciaria: false,
      itens: [
        {
          tipo: 'judiciais',
          descricao: 'Conhecimento 2%',
          apurar: true,
          percentual: 2,
          valor_minimo: 0,
          isento: false,
        },
        {
          tipo: 'outras',
          descricao: 'Taxa Fixa',
          apurar: true,
          percentual: 0,
          valor_fixo: 50,
          valor_minimo: 0,
          isento: false,
        },
      ],
    };
    const html = buildRelatorioCustasHTML(makeResumo(itens), { custasConfig });
    // Percentual 2,00 %
    expect(html).toMatch(/2,00\s*%/);
    // Valor fixo 50,00
    expect(html).toContain('50,00');
  });

  it('aceita resumo sem custas (relatorio vazio) sem quebrar', async () => {
    const blob = gerarRelatorioCustasDetalhado(makeResumo([], 0));
    const text = await blob.text();
    expect(text).toContain('Nenhuma custa apurada');
    // Total geral zero ainda e exibido
    expect(text).toContain('Total Geral de Custas');
    expect(text).toContain('0,00');
  });
});
