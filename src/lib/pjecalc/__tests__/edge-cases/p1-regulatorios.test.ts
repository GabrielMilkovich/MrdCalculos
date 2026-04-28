/**
 * EDGE CASES — P1: Regulatórios (10 cenários jurídicos/tributários críticos)
 *
 * Estes 10 cenários cobrem regras que mudaram ao longo do tempo ou têm
 * aplicação complexa. Cada teste documenta a lei/reforma relevante.
 */

import { describe, it, expect } from 'vitest';
import { makeMinimalCase, runMinimalEngine, summarizeResult } from './helpers';

describe('P1 — Edge Regulatórios', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // 11. ADC 58 transição em 2020-12 (data exata)
  // Lei: EC 102/2019 (ADC 58 — Alíquota de Contribuição Social)
  // Transição: 07/12/2020 (alíquota passa de 11% para regra de faixas)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('11. ADC 58 transição 2020-12-07 — mudança de alíquota', () => {
    // TODO: Feature não implementada — transição ADC 58 com data exata
    // Em 07/12/2020, a alíquota de CS muda de plana para faixas progressivas
    // Este teste verifica que períodos PRE/POST são calculados corretamente
    const caseData = makeMinimalCase({
      data_admissao: '2020-01-01',
      data_demissao: '2021-06-01',
      salario_mensal: 3000,
      tem_adc58: true,
      adc58_tipo: 'TRANSICAO',
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // PRE 2020-12-07: 11% flat
    // POS 2020-12-07: faixas progressivas (7.5% até X, 9% até Y, 12% acima)
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 12. ADC 58 transição em 2021-11-26 (EC 113 — Reforma Tributária)
  // Lei: EC 113/2021
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('12. ADC 58 transição 2021-11-26 — EC 113', () => {
    // TODO: Feature não implementada — nova transição com EC 113
    // Em 26/11/2021, houve nova mudança nas alíquotas (desoneração parcial)
    const caseData = makeMinimalCase({
      data_admissao: '2021-01-01',
      data_demissao: '2022-06-01',
      salario_mensal: 3500,
      tem_adc58: true,
      adc58_tipo: 'TRANSICAO',
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Alíquota muda novamente em 26/11/2021
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 13. Reforma Lei 14.973/2024 — IPCA-E mudança
  // Lei: Lei 14.973/2024 (Reforma Tributária)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('13. Lei 14.973/2024 — IPCA-E mudança índice atualização', () => {
    // TODO: Feature não implementada — suporte a Lei 14.973/2024
    // Lei 14.973/2024 pode ter alterado regras de IPCA-E ou outro índice
    const caseData = makeMinimalCase({
      data_admissao: '2023-01-01',
      data_demissao: '2024-12-01',
      salario_mensal: 3000,
      correcaoConfig: {
        indice: 'IPCA-E', // Verificar se Lei 14.973 muda esse índice
      },
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 14. Lei 14.905/2024 — taxa legal SELIC-IPCA (já testada via leide)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('14. Lei 14.905/2024 — taxa SELIC-IPCA para créditos tributários', () => {
    // TODO: Verificar se implementado — Lei 14.905/2024
    // Lei 14.905/2024 pode ter alterado taxa de juros legais
    const caseData = makeMinimalCase({
      data_admissao: '2024-01-01',
      data_demissao: '2025-01-01',
      salario_mensal: 3000,
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Verificar se juros usam taxa 14.905 quando aplicável
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 15. Insalubridade pré-2017 — base salário-mínimo regional
  // Lei: CLT 192-194, Lei 6.514/77
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('15. Insalubridade pré-2017 — base salário-mínimo regional', () => {
    // TODO: Feature não implementada — insalubridade com base regional
    // Pré-2017, insalubridade podia usar salário-mínimo regional (não federal)
    const caseData = makeMinimalCase({
      data_admissao: '2015-01-01',
      data_demissao: '2017-06-01',
      salario_mensal: 3000,
      estado: 'BA', // para usar mínimo regional baiano
    });

    // TODO: Adicionar flag insalubridade com tipo
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Pré-2017: insalubridade = 20% × salário-mínimo regional
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 16. Periculosidade 30% + Insalubridade 40% — prevalece a maior (não acumula)
  // Lei: CLT 193-194, Súmula TST 362
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('16. Periculosidade 30% + Insalubridade 40% — prevalece maior, não soma', () => {
    // TODO: Feature não implementada — acumulação de adicionais
    // Súmula TST 362: não se acumulam insalubridade e periculosidade
    // Prevalece a maior (40%)
    const caseData = makeMinimalCase({
      data_admissao: '2020-01-01',
      data_demissao: '2023-12-01',
      salario_mensal: 3000,
    });

    // TODO: Adicionar flag de insalubridade + periculosidade
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Não somar: usar 40%, não 70%
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 17. Adicional noturno hora reduzida (52'30")
  // Lei: CLT 73, Súmula TST 60
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('17. Adicional noturno — hora reduzida 52"30 (não 60 minutos)', () => {
    // TODO: Feature não implementada — hora noturna reduzida
    // Noturno: hora é considerada como 52'30" (52.5 minutos), não 60
    // Logo, 8 horas noturnas = 7 horas (aproximadamente)
    const caseData = makeMinimalCase({
      data_admissao: '2023-01-01',
      data_demissao: '2024-12-01',
      salario_mensal: 3000,
    });

    // TODO: Adicionar flag trabalho_noturno
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Noturno: N × 52.5/60 (redução horária)
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 18. Salário-família com mais de 5 dependentes
  // Lei: Lei 12.612/2012, Lei 13.154/2015
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('18. Salário-família com mais de 5 dependentes', () => {
    // TODO: Feature não implementada — salário-família
    // Limite de dependentes foi alterado ao longo do tempo
    // Hoje: máximo X dependentes contam
    const caseData = makeMinimalCase({
      data_admissao: '2023-01-01',
      data_demissao: '2024-12-01',
      salario_mensal: 2500,
      params: {
        // TODO: campo dependentes não está em PjeParametros
      },
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 19. INSS empregador doméstico (8%) vs comum (20% + SAT + terceiros)
  // Lei: LC 150/2015
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('19. INSS doméstico 8% vs comum (20%) — alíquota diferenciada', () => {
    // Este teste compara alíquota de CS entre doméstico (8%) e CLT comum (20%)
    const caseDataDomestico = makeMinimalCase({
      regime: 'DOMESTICO',
      salario_mensal: 2000,
      meses: 12,
    });

    const resultDomestico = runMinimalEngine(caseDataDomestico);
    const summaryDomestico = summarizeResult(resultDomestico);

    const caseDataClt = makeMinimalCase({
      regime: 'CLT',
      salario_mensal: 2000,
      meses: 12,
    });

    const resultClt = runMinimalEngine(caseDataClt);
    const summaryClt = summarizeResult(resultClt);

    // Doméstico: CS empresa muito menor que CLT comum
    expect(summaryDomestico.cs_empresa).toBeLessThan(summaryClt.cs_empresa);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 20. Simples Nacional — empresa isenta de CS empresa
  // Lei: Lei 11.941/2009, LC 123/2006
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('20. Simples Nacional — isento de CS empresa (20%)', () => {
    // TODO: Feature não implementada — régime Simples Nacional
    // Empresa optante por Simples é isenta de CS empresa sobre folha
    const caseData = makeMinimalCase({
      salario_mensal: 3000,
      meses: 12,
      params: {
        // TODO: campo regime_empresa não existe em PjeParametros
        // Deveria ter: regime_empresa: 'lucro_real' | 'lucro_presumido' | 'simples'
      },
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Simples: cs_empresa = 0 (isento)
  });
});
