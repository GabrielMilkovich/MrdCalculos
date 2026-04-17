/**
 * Tests - pdf-report-precatorio
 *
 * Valida a geracao do Relatorio de Precatorio/RPV com 12 secoes:
 *   1. Cabecalho, 2. Valor Bruto, 3. Credito Reclamante,
 *   4. INSS Segurado, 5. IR, 6. INSS Patronal, 7. FGTS+Multa,
 *   8. Multas, 9. Honorarios, 10. Custas, 11. Atualizacao, 12. Consolidado
 */
import { describe, it, expect } from 'vitest';
import {
  gerarRelatorioPrecatorio,
  buildRelatorioPrecatorioHTML,
} from '../pdf-report-precatorio';
import type { PjeLiquidacaoResult, PjeCustaResult } from '../engine-types';

function makeResult(overrides?: Partial<PjeLiquidacaoResult['resumo']>): PjeLiquidacaoResult {
  const custasDet: PjeCustaResult[] = [
    { tipo: 'judiciais', descricao: 'Conhecimento 2%', valor: 120.5 },
    { tipo: 'periciais', descricao: 'Pericia Contabil', valor: 1500 },
    { tipo: 'postais', descricao: 'AR', valor: 30 },
  ];

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
      multa_523: 1000,
      multa_467: 500,
      honorarios_sucumbenciais: 3500,
      honorarios_contratuais: 1800,
      custas: 1650.5,
      custas_detalhadas: custasDet,
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: 31300,
      total_reclamada: 56550,
      ...overrides,
    },
  };
}

describe('gerarRelatorioPrecatorio', () => {
  it('retorna Blob text/html nao-vazio com DOCTYPE', async () => {
    const result = makeResult();
    const blob = gerarRelatorioPrecatorio(result, {
      tipoPrecatorio: 'FEDERAL',
      esfera: 'Uniao',
      processo: '0001-23.2024.5.02.0001',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(blob.size).toBeGreaterThan(500);
    const text = await blob.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('</html>');
    expect(text).toContain('0001-23.2024.5.02.0001');
  });

  it('inclui todas as 12 secoes estruturais do relatorio', () => {
    const html = buildRelatorioPrecatorioHTML(makeResult(), {
      tipoPrecatorio: 'FEDERAL',
      esfera: 'Uniao',
      processo: '0001',
    });
    // 1. Cabecalho
    expect(html).toContain('RELATORIO DE');
    expect(html).toContain('Data Liquidacao');
    // 2-12 (secoes numeradas)
    expect(html).toContain('2. Valor Bruto Devido');
    expect(html).toContain('3. Credito Total ao Reclamante');
    expect(html).toContain('4. Debito Reclamante - INSS Segurado');
    expect(html).toContain('5. Debito Reclamante - IR Retido');
    expect(html).toContain('6. Debito Reclamado - INSS Empregador');
    expect(html).toContain('7. FGTS + Multa 40%');
    expect(html).toContain('8. Multas');
    expect(html).toContain('9. Honorarios');
    expect(html).toContain('10. Custas Judiciais');
    expect(html).toContain('11. Atualizacao Monetaria');
    expect(html).toContain('12. Totais Consolidados');
  });

  it('renderiza corretamente os 3 tipos de precatorio (FEDERAL/ESTADUAL/MUNICIPAL)', () => {
    const result = makeResult();

    const htmlFed = buildRelatorioPrecatorioHTML(result, {
      tipoPrecatorio: 'FEDERAL',
      esfera: 'Uniao',
      processo: '001',
    });
    expect(htmlFed).toContain('FEDERAL');
    expect(htmlFed).toContain('Precatorio Federal'.toUpperCase());
    expect(htmlFed).toContain('Uniao');

    const htmlEst = buildRelatorioPrecatorioHTML(result, {
      tipoPrecatorio: 'ESTADUAL',
      esfera: 'Estado de Sao Paulo',
      processo: '002',
    });
    expect(htmlEst).toContain('ESTADUAL');
    expect(htmlEst).toContain('Precatorio Estadual'.toUpperCase());
    expect(htmlEst).toContain('Estado de Sao Paulo');

    const htmlMun = buildRelatorioPrecatorioHTML(result, {
      tipoPrecatorio: 'MUNICIPAL',
      esfera: 'Municipio de Campinas',
      processo: '003',
    });
    expect(htmlMun).toContain('MUNICIPAL');
    expect(htmlMun).toContain('Precatorio Municipal'.toUpperCase());
    expect(htmlMun).toContain('Municipio de Campinas');
  });

  it('formata valores monetarios em pt-BR (2 casas, separador .)', () => {
    const html = buildRelatorioPrecatorioHTML(makeResult(), {
      tipoPrecatorio: 'FEDERAL',
      esfera: 'Uniao',
      processo: '001',
    });
    // 35000 -> "35.000,00"
    expect(html).toContain('35.000,00');
    // 31300 (liquido) -> "31.300,00"
    expect(html).toContain('31.300,00');
    // 1200 (IR) -> "1.200,00"
    expect(html).toContain('1.200,00');
    // 56550 (total_reclamada) -> "56.550,00"
    expect(html).toContain('56.550,00');
    // Custas detalhadas 120,50 (judiciais)
    expect(html).toContain('120,50');
    // 1.500,00 (pericia)
    expect(html).toContain('1.500,00');
  });

  it('exibe mensagem quando nao ha custas detalhadas', () => {
    const html = buildRelatorioPrecatorioHTML(
      makeResult({ custas: 0, custas_detalhadas: [] }),
      { tipoPrecatorio: 'FEDERAL', esfera: 'Uniao', processo: '001' },
    );
    expect(html).toContain('Nenhuma custa apurada');
    expect(html).toContain('10. Custas Judiciais');
  });

  it('total consolidado reflete resumo.total_reclamada', () => {
    const result = makeResult({ total_reclamada: 99999.99 });
    const html = buildRelatorioPrecatorioHTML(result, {
      tipoPrecatorio: 'FEDERAL',
      esfera: 'Uniao',
      processo: '001',
    });
    expect(html).toContain('TOTAL DEVIDO PELO RECLAMADO');
    expect(html).toContain('99.999,99');
  });
});
