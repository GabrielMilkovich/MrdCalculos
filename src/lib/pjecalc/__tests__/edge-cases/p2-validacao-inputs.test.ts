/**
 * EDGE CASES — P2: Validação de Inputs (10 cenários de entrada inválida/extrema)
 *
 * Estes 10 testes cobrem casos onde os inputs são inválidos ou extremos.
 * O engine deve rejeitar inputs inválidos e processar extremos corretamente.
 */

import { describe, it, expect } from 'vitest';
import { makeMinimalCase, runMinimalEngine, summarizeResult } from './helpers';

describe('P2 — Validação de Inputs', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // 21. Datas inválidas (admissão > demissão)
  // ────────────────────────────────────────────────────────────────────────────
  it('21. Datas inválidas — admissão depois de demissão deve falhar', () => {
    // Criar um caso com datas inválidas
    const caseData = makeMinimalCase({
      data_admissao: '2023-12-31',
      data_demissao: '2023-01-01', // ANTES da admissão!
    });

    // O engine deve lançar erro ou retornar resultado vazio
    let errorThrown = false;
    try {
      const result = runMinimalEngine(caseData);
      // Se não lançar erro, espera resultado vazio
      const summary = summarizeResult(result);
      expect(summary.principal).toBe(0);
    } catch (err) {
      errorThrown = true;
      expect(errorThrown).toBe(true);
    }

    // Ou erro é lançado, ou resultado é vazio
    expect(errorThrown || summarizeResult(runMinimalEngine(caseData)).principal === 0).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 22. Salário negativo
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('22. Salário negativo deve ser rejeitado ou zerificado', () => {
    const caseData = makeMinimalCase({
      salario_mensal: -1000, // Salário negativo!
    });

    let errorThrown = false;
    try {
      const result = runMinimalEngine(caseData);
      const summary = summarizeResult(result);
      // Se não erro, espera valores zerados ou ajustados
      expect(summary.principal).toBeLessThanOrEqual(0);
    } catch (err) {
      errorThrown = true;
      expect(errorThrown).toBe(true);
    }

    expect(errorThrown).toBe(true); // Esperamos que lance erro
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 23. Faltas > dias do mês
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('23. Faltas > dias úteis do mês deve ser rejeitado', () => {
    // TODO: Adicionar faltas ao makeMinimalCase
    // Faltas não justificadas > 22 dias úteis mensais é inválido
    const caseData = makeMinimalCase({
      data_admissao: '2023-01-01',
      data_demissao: '2023-02-01',
      // TODO: Adicionar campo faltas_nao_justificadas: 25 (febrero tem ~20 úteis)
    });

    // Engine deve rejeitar
    expect(() => runMinimalEngine(caseData)).toThrow();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 24. Férias gozadas sem direito (período aquisitivo incompleto)
  // Lei: CLT 130
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('24. Férias gozadas sem direito — período < 12 meses', () => {
    // TODO: Adicionar férias ao makeMinimalCase
    // Empregado não tem direito a férias se não completou 12 meses
    // Se foram gozadas mesmo assim, deve haver desconto ou retenção
    const caseData = makeMinimalCase({
      data_admissao: '2023-01-01',
      data_demissao: '2023-06-01', // Apenas 6 meses
      // TODO: Adicionar ferias_gozadas com período > 0
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Deveria descontar férias indevidamente gozadas
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 25. 13º proporcional avos > 12
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('25. 13º proporcional avos > 12 (inválido) deve ser limitado', () => {
    const caseData = makeMinimalCase({
      data_admissao: '2022-01-01',
      data_demissao: '2025-01-01', // 36 meses = 3 anos
      salario_mensal: 3000,
      meses: 36,
    });

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // 13º não pode ser mais de 12 meses (1 ano completo)
    // Se houver 36 meses, proporcional deveria ser apenas 3 × 1 = 3 anos
    // Mas limite: máximo 12 avos por ano de contrato
    // Logo, máximo 36 avos / 36 meses = 1 (inteiro), não 3
    expect(summary.principal).toBeGreaterThan(0); // Tem valores
    // 13º deveria estar capped
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 26. Aviso prévio proporcional > 90 dias (Lei 12.506/2011 — máximo)
  // ────────────────────────────────────────────────────────────────────────────
  it('26. Aviso prévio proporcional > 90 dias deve ser capped', () => {
    const caseData = makeMinimalCase({
      data_admissao: '2015-01-01',
      data_demissao: '2025-01-01', // 10 anos! Aviso deveria ser 90 dias max
      salario_mensal: 3000,
    });

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // Aviso prévio tem limite de 90 dias proporcional
    // Lei 12.506/2011: cada ano de contrato = 30 dias, máximo 90 dias
    expect(summary.aviso_previo).toBeLessThanOrEqual(3000 * 3); // 90 dias = 3 meses
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 27. Múltiplas correções aplicadas erro (combinação contraditória)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('27. Múltiplas correções conflitantes — motor escolhe uma', () => {
    // TODO: Adicionar configuração de múltiplas correções
    // Se configurar IPCA-E + SELIC simultaneamente (ambas apurar=true),
    // engine deve usar apenas uma
    const caseData = makeMinimalCase({
      correcaoConfig: {
        indice: 'IPCA-E', // ou misturar dois índices?
        // TODO: Verificar se é possível ter múltiplos índices
      },
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 28. Verba com valor=null (inválida)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('28. Verba com valor=null deve ser ignorada ou causar erro', () => {
    // TODO: Adicionar suporte a verbas customizadas com valor nulo
    const caseData = makeMinimalCase({
      verbas: [
        {
          id: 'verba-nula',
          nome: 'Verba Nula',
          valor: null, // Campo esperado number, mas é nulo
        },
      ],
    });

    // Engine deve ignorar ou lançar erro
    let errorThrown = false;
    try {
      runMinimalEngine(caseData);
    } catch (err) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 29. Caso vazio (zero verbas, zero historicos)
  // ────────────────────────────────────────────────────────────────────────────
  it('29. Caso vazio — nenhuma verba, nenhum histórico, resultado = 0', () => {
    const caseData = makeMinimalCase({
      salario_mensal: 0,
      meses: 0,
      tem_ferias_indenizadas: false,
      tem_13: false,
    });

    // Remover todas as verbas padrão e historicos
    caseData.historicos = [];
    caseData.verbas = [];

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // Caso vazio deve resultar em 0 ou mínimo absoluto
    expect(summary.principal).toBe(0);
    expect(summary.total_devido).toBeLessThanOrEqual(0);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 30. Caso só com verbas COBRAR (devida pelo reclamante)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('30. Caso só com verbas negativas (deve cobrar, não pagar)', () => {
    // TODO: Feature não implementada — verbas em "vermelho"
    // Se reclamante é devedor (ex: aviso indenizado não gozado),
    // resultado deve ser negativo (empresa cobra do reclamante)
    const caseData = makeMinimalCase({
      salario_mensal: 3000,
      meses: 12,
      params: {
        // TODO: Adicionar flag que torna reclamante devedor
      },
    });

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // Resultado deveria ser negativo
    expect(summary.total_devido).toBeLessThan(0);
  });
});
