/**
 * Tests - pdf-report-pensao-alimenticia
 *
 * Valida o Demonstrativo de Pensao Alimenticia:
 *   - Blob text/html valido com secoes obrigatorias
 *   - Dados do beneficiario renderizados
 *   - Base de calculo, percentual e valores em pt-BR
 *   - Compensacoes somadas e liquido devido correto
 */
import { describe, it, expect } from 'vitest';
import {
  gerarRelatorioPensaoAlimenticia,
  buildRelatorioPensaoAlimenticiaHTML,
} from '../pdf-report-pensao-alimenticia';
import type { PjeLiquidacaoResult, PjePensaoConfig } from '../engine-types';

function makeResult(pensao_total: number, pensao_sobre_fgts = 0): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
    fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
    contribuicao_social: { segurado_devidos: [], segurado_pagos: [], empregador: [], total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 },
    imposto_renda: { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
    seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: false, cotas: [], total: 0 },
    resumo: {
      principal_bruto: 0, principal_corrigido: 0, juros_mora: 0, fgts_total: 0,
      cs_segurado: 0, cs_empregador: 0, ir_retido: 0, seguro_desemprego: 0,
      previdencia_privada: 0, salario_familia: 0, multa_523: 0, multa_467: 0,
      honorarios_sucumbenciais: 0, honorarios_contratuais: 0, custas: 0,
      custas_detalhadas: [], pensao_sobre_fgts, pensao_total,
      contribuicao_sindical: 0, abono_pecuniario: 0, liquido_reclamante: 0,
      total_reclamada: 0,
    },
  };
}

describe('gerarRelatorioPensaoAlimenticia', () => {
  it('retorna Blob text/html nao vazio com DOCTYPE e titulo', async () => {
    const blob = gerarRelatorioPensaoAlimenticia(makeResult(5000, 800), {
      cliente: 'Alimentante Fulano',
      processo: '0123-45.2024.5.02.0002',
      beneficiario: { nome: 'Filho Menor', parentesco: 'filho', cpf: '111.222.333-44' },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    const text = await blob.text();
    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('DEMONSTRATIVO DE PENSAO ALIMENTICIA');
    expect(text).toContain('Alimentante Fulano');
    expect(text).toContain('Filho Menor');
    expect(text).toContain('111.222.333-44');
  });

  it('renderiza secoes obrigatorias (Beneficiario, Parametros, Apuracao, fundamento legal)', () => {
    const cfg: PjePensaoConfig = { apurar: true, percentual: 30, base: 'liquido' };
    const html = buildRelatorioPensaoAlimenticiaHTML(makeResult(3000, 500), { pensaoConfig: cfg });
    expect(html).toContain('Beneficiario da Pensao');
    expect(html).toContain('Parametros');
    expect(html).toContain('Apuracao');
    expect(html).toContain('Liquido Devido ao Beneficiario');
    expect(html).toMatch(/CPC\s*art\.\s*528/);
  });

  it('formata percentual, base de calculo e valores pt-BR corretamente', () => {
    const cfg: PjePensaoConfig = { apurar: true, percentual: 30, base: 'bruto_menos_inss' };
    const html = buildRelatorioPensaoAlimenticiaHTML(makeResult(2500.75, 400.25), {
      pensaoConfig: cfg,
    });
    expect(html).toMatch(/30,00\s*%/);
    expect(html).toContain('Bruto menos INSS');
    // Pensao principal = 2500.75 - 400.25 = 2100.50
    expect(html).toContain('2.100,50');
    expect(html).toContain('400,25');
    expect(html).toContain('2.500,75');
  });

  it('soma compensacoes e calcula liquido devido com Decimal.js', async () => {
    const blob = gerarRelatorioPensaoAlimenticia(makeResult(1000, 0), {
      compensacoes: [
        { descricao: 'Pagamento jan/2024', valor: 100.1 },
        { descricao: 'Pagamento fev/2024', valor: 200.2 },
      ],
    });
    const text = await blob.text();
    expect(text).toContain('Compensacoes');
    expect(text).toContain('Pagamento jan/2024');
    // Total compensacoes = 300.30 (sem erro de ponto flutuante)
    expect(text).toContain('300,30');
    // Liquido devido = 1000 - 300.30 = 699.70
    expect(text).toContain('699,70');
  });
});
