/**
 * Tests - pdf-report-seguro-desemprego
 *
 * Valida o Demonstrativo de Seguro Desemprego:
 *   - Blob text/html valido
 *   - Cabecalho e secoes presentes (tempo contribuicao, parcelas, total)
 *   - Valores formatados em pt-BR
 *   - Contagem de meses entre admissao e dispensa
 */
import { describe, it, expect } from 'vitest';
import {
  gerarRelatorioSeguroDesemprego,
  buildRelatorioSeguroDesempregoHTML,
} from '../pdf-report-seguro-desemprego';
import type { PjeLiquidacaoResult, PjeSeguroConfig } from '../engine-types';

function makeResult(parcelas: number, valor_parcela: number): PjeLiquidacaoResult {
  const total = parcelas * valor_parcela;
  return {
    data_liquidacao: '2025-06-15',
    verbas: [],
    fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
    contribuicao_social: { segurado_devidos: [], segurado_pagos: [], empregador: [], total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 },
    imposto_renda: { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
    seguro_desemprego: { apurado: parcelas > 0, parcelas, valor_parcela, total },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: false, cotas: [], total: 0 },
    resumo: {
      principal_bruto: 0, principal_corrigido: 0, juros_mora: 0, fgts_total: 0,
      cs_segurado: 0, cs_empregador: 0, ir_retido: 0, seguro_desemprego: total,
      previdencia_privada: 0, salario_familia: 0, multa_523: 0, multa_467: 0,
      honorarios_sucumbenciais: 0, honorarios_contratuais: 0, custas: 0,
      custas_detalhadas: [], pensao_sobre_fgts: 0, pensao_total: 0,
      contribuicao_sindical: 0, abono_pecuniario: 0, liquido_reclamante: 0,
      total_reclamada: 0,
    },
  };
}

describe('gerarRelatorioSeguroDesemprego', () => {
  it('retorna Blob text/html nao vazio com DOCTYPE e titulo', async () => {
    const blob = gerarRelatorioSeguroDesemprego(makeResult(4, 1500), {
      cliente: 'Carla Souza',
      processo: '1000-99.2025.5.02.0010',
      dataAdmissao: '2022-03-01',
      dataDispensa: '2024-12-15',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html;charset=utf-8');
    const text = await blob.text();
    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('DEMONSTRATIVO DE SEGURO DESEMPREGO');
    expect(text).toContain('Carla Souza');
    expect(text).toContain('1000-99.2025.5.02.0010');
  });

  it('renderiza as secoes obrigatorias e o fundamento legal', () => {
    const html = buildRelatorioSeguroDesempregoHTML(makeResult(5, 1800));
    expect(html).toContain('Tempo de Contribuicao');
    expect(html).toContain('Parcelas Devidas');
    expect(html).toContain('Detalhamento');
    expect(html).toContain('Total Seguro Desemprego');
    expect(html).toMatch(/Lei\s*7\.998\/90/);
  });

  it('formata valores em pt-BR e calcula meses entre admissao e dispensa', () => {
    const html = buildRelatorioSeguroDesempregoHTML(makeResult(4, 1234.56), {
      dataAdmissao: '2022-01-10',
      dataDispensa: '2024-07-20', // 30 meses aproximados
    });
    // Valor da parcela
    expect(html).toContain('1.234,56');
    // Total = 4 * 1234.56 = 4938.24
    expect(html).toContain('4.938,24');
    // Meses calculados = (2024-2022)*12 + (7-1) = 30
    expect(html).toContain('<strong>Meses:</strong> 30');
    // Admissao formatada pt-BR
    expect(html).toContain('10/01/2022');
    expect(html).toContain('20/07/2024');
  });

  it('respeita a config seguroConfig (recebeu) e aceita zero parcelas', async () => {
    const cfg: PjeSeguroConfig = { apurar: true, parcelas: 0, recebeu: true };
    const blob = gerarRelatorioSeguroDesemprego(makeResult(0, 0), { seguroConfig: cfg });
    const text = await blob.text();
    expect(text).toContain('Ja recebeu:</strong> Sim');
    expect(text).toContain('Nenhuma parcela apurada');
  });
});
