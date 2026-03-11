/**
 * Parity Engine Tests
 * Tests the comparison between engine results and PJC ground truth.
 */

import { describe, it, expect } from 'vitest';
import { gerarRelatorioParidade, DEFAULT_TOLERANCE } from '../lib/pjecalc/domain/parity-engine';
import type { PjeLiquidacaoResult } from '../lib/pjecalc/engine-types';
import type { PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

function mockEngineResult(overrides: Partial<PjeLiquidacaoResult['resumo']> = {}): PjeLiquidacaoResult {
  return {
    data_liquidacao: '2025-01-15',
    verbas: [],
    fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
    contribuicao_social: { segurado_devidos: [], segurado_pagos: [], empregador: [], total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 },
    imposto_renda: { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'art_12a_rra', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
    seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
    previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
    salario_familia: { apurado: false, cotas: [], total: 0 },
    resumo: {
      principal_bruto: 50000,
      principal_corrigido: 55000,
      juros_mora: 5000,
      fgts_total: 4000,
      cs_segurado: 3000,
      cs_empregador: 2000,
      ir_retido: 1500,
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: 0,
      multa_467: 0,
      honorarios_sucumbenciais: 8000,
      honorarios_contratuais: 0,
      custas: 1000,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      liquido_reclamante: 52500,
      total_reclamada: 70000,
      ...overrides,
    },
  };
}

function mockPJCAnalysis(overrides: Partial<PJCAnalysis['resultado']> = {}): PJCAnalysis {
  return {
    parametros: {
      beneficiario: 'Test User',
      cpf: '000.000.000-00',
      reclamado: 'Test Company',
      cnpj: '00.000.000/0000-00',
      admissao: '2020-01-01',
      demissao: '2023-06-30',
      ajuizamento: '2023-07-15',
      inicio_calculo: '2020-01-01',
      termino_calculo: '2023-06-30',
      data_liquidacao: '2025-01-15',
      carga_horaria: 220,
      sabado_dia_util: true,
      projeta_aviso: false,
      feriado_estadual: false,
      feriado_municipal: false,
      regime: 'CLT',
      indices_acumulados: 'IPCAE',
      dia_fechamento: 31,
      versao_sistema: '2.8.0.0',
      zera_negativo: true,
      prescricao_quinquenal: true,
      prescricao_fgts: true,
      limitar_avos: true,
    },
    resultado: {
      liquido_exequente: 52500,
      inss_reclamante: 3000,
      inss_reclamado: 2000,
      imposto_renda: 1500,
      fgts_deposito: 4000,
      honorarios: [{ nome: 'Adv', cpf: '111.111.111-11', valor: 8000 }],
      custas: 1000,
      ...overrides,
    },
    verbas: [],
    historicos_salariais: [],
    apuracao_diaria_count: 0,
    apuracao_diaria: [],
    faltas: [],
    ferias: [],
    atualizacao: { indice_base: 'IPCAE', combinacoes_indice: [], combinacoes_juros: [], juros_apos_deducao_cs: true },
    dag: [],
  } as PJCAnalysis;
}

describe('Parity Engine', () => {
  it('should produce 100% score when engine matches PJC exactly', () => {
    const result = mockEngineResult();
    const pjc = mockPJCAnalysis();
    const report = gerarRelatorioParidade(result, pjc);
    
    expect(report.score).toBe(100);
    expect(report.totais.liquido_exequente.delta).toBe(0);
    expect(report.totais.inss_reclamante.delta).toBe(0);
  });

  it('should detect divergences when engine differs from PJC', () => {
    const result = mockEngineResult({ liquido_reclamante: 55000 }); // +2500 divergence
    const pjc = mockPJCAnalysis();
    const report = gerarRelatorioParidade(result, pjc);
    
    expect(report.score).toBeLessThan(100);
    expect(report.totais.liquido_exequente.delta).toBeCloseTo(2500);
    expect(report.totais.liquido_exequente.delta_pct).toBeGreaterThan(0);
  });

  it('should have proper tolerance policy', () => {
    expect(DEFAULT_TOLERANCE.monetaria_absoluta).toBe(0.02);
    expect(DEFAULT_TOLERANCE.percentual_maximo).toBe(0.5);
  });

  it('should include case metadata', () => {
    const result = mockEngineResult();
    const pjc = mockPJCAnalysis();
    const report = gerarRelatorioParidade(result, pjc, '3.2.0');
    
    expect(report.caso).toBe('Test User');
    expect(report.engine_version).toBe('3.2.0');
    expect(report.pjc_version).toBe('2.8.0.0');
  });
});
