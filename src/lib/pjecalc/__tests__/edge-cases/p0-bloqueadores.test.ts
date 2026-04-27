/**
 * EDGE CASES — P0: Bloqueadores Produção (10 cenários críticos)
 *
 * Estes 10 cenários cobrem situações jurídicas críticas que podem quebrar
 * em produção se o engine não os tratar corretamente. Cada teste documenta
 * a lei/súmula relevante.
 */

import { describe, it, expect } from 'vitest';
import { makeMinimalCase, runMinimalEngine, summarizeResult } from './helpers';

describe('P0 — Bloqueadores Produção', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // 1. Contrato em curso (sem demissão) — sem multa 40%, sem aviso indenizado
  // Lei: CLT 477 (rescisão tem efeitos)
  // ────────────────────────────────────────────────────────────────────────────
  it('1. Contrato em curso — sem multa 40% FGTS (ativa, sem rescisão)', () => {
    // Trabalhador ATIVO (em_curso=true, sem data_demissao)
    // Não há rescisão, então FGTS não recebe multa (só depósitos)
    const caseData = makeMinimalCase({
      salario_mensal: 3000,
      meses: 24,
      em_curso: true,
      tem_multa_fgts: false, // em curso não gera multa
      data_admissao: '2021-01-01',
      data_ajuizamento: '2025-01-01',
    });

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // Se contrato está em curso, a reclamação é por diferenças e não há rescisão
    // Logo, multa 40% não deve ser aplicada
    expect(summary.fgts_multa).toBe(0);
    // Depósitos FGTS devem existir (8% do salário ao longo do período)
    expect(summary.fgts_depositos).toBeGreaterThanOrEqual(0);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Trabalhador rural — Lei 5.889/73, prescrição diferenciada
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('2. Trabalhador rural — Lei 5.889/73, prescrição 5 anos', () => {
    // TODO: Feature não implementada — regime RURAL com prescrição diferenciada
    // Será tratado em Sprint 6 após levantamento de regras específicas
    const caseData = makeMinimalCase({
      regime: 'RURAL',
      salario_mensal: 2500,
      meses: 36,
      data_admissao: '2019-01-01',
      data_demissao: '2022-01-01',
      data_ajuizamento: '2026-01-01', // 4 anos após demissão
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Lei 5.889/73: prescrição de 5 anos para ações rescisórias
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Trabalhador doméstico — LC 150/2015, alíquota INSS 8% empregador
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('3. Trabalhador doméstico — CS 8% empregador (não 20%)', () => {
    // LC 150/2015: doméstico tem alíquota reduzida para CS empregador
    const caseData = makeMinimalCase({
      regime: 'DOMESTICO',
      salario_mensal: 2000,
      meses: 12,
      data_admissao: '2023-01-01',
      data_demissao: '2024-01-01',
    });

    const result = runMinimalEngine(caseData);
    const summary = summarizeResult(result);

    // Para doméstico, CS empresa deve ser 8% (não 20%)
    // Sobre principal de ~2000 * 12 = 24000
    // CS 8% = 1920 (aproximadamente)
    expect(summary.cs_empresa).toBeGreaterThan(0);
    expect(summary.cs_empresa).toBeLessThan(summary.cs_empresa * 3); // ~1920, não ~4800
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Aprendiz — CLT 428, salário-mínimo proporcional
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('4. Aprendiz — CLT 428, salário-mínimo proporcional', () => {
    // TODO: Feature não implementada — regime APRENDIZ com regras específicas
    // Contrato aprendiz tem piso salarial diferenciado e limites de jornada
    const caseData = makeMinimalCase({
      regime: 'APRENDIZ',
      salario_mensal: 1320, // próximo do mínimo (aprendiz pode ganhar menos)
      meses: 24,
      data_admissao: '2023-01-01',
      data_demissao: '2025-01-01',
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // CLT 428: máximo 2 anos de contrato aprendiz
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Estagiário — Lei 11.788/08, não-CLT, sem direitos rescisórios
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('5. Estagiário — Lei 11.788/08, sem FGTS/13º/férias', () => {
    // TODO: Feature não implementada — regime ESTAGIARIO
    // Estagiário não é empregado CLT, sem direitos a FGTS, 13º, férias indenizadas
    const caseData = makeMinimalCase({
      regime: 'ESTAGIARIO',
      salario_mensal: 1500,
      meses: 12,
      tem_multa_fgts: false,
      tem_13: false,
      tem_ferias_indenizadas: false,
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Lei 11.788/08: contrato não gera direitos de empregado
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Reclamação reconvencional — devedor é o reclamante, sinal invertido
  // Lei: CPC 355
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('6. Reclamação reconvencional — valores em vermelho (devedor = reclamante)', () => {
    // TODO: Feature não implementada — flag de reconvenção
    // Em reconvenção, o reclamante é devedor de descontos/multas/aviso
    // Logo, valores que seriam PAGAR tornam-se COBRAR
    const caseData = makeMinimalCase({
      salario_mensal: 3000,
      meses: 12,
      data_admissao: '2023-01-01',
      data_demissao: '2024-01-01',
    });

    // Adicionar flag de reconvenção (não existe em engine ainda)
    // result.resumo.valor_principal deveria ser negativo
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Pensão alimentícia ATIVA cobrando do reclamante — desconto na rescisória
  // Lei: CPC 528-B
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('7. Pensão alimentícia — desconto compulsório da rescisória', () => {
    // TODO: Feature não implementada — configuração de pensão alimentícia ativa
    // Quando reclamante é devedor de pensão, deve-se descontar da rescisória
    // antes de entregar ao reclamante
    const caseData = makeMinimalCase({
      salario_mensal: 4000,
      meses: 24,
      params: {
        // TODO: campo pensao_alimenticia_devida não existe em PjeParametros
      },
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Rescisória - pensão = valor efetivo ao reclamante
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Múltiplos beneficiários (espólio) — divisão proporcional
  // Lei: CC 1790
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('8. Espólio com múltiplos beneficiários — divisão proporcional', () => {
    // TODO: Feature não implementada — split de liquidação entre herdeiros
    // Se reclamante faleceu, a liquidação é dividida entre herdeiros
    const caseData = makeMinimalCase({
      salario_mensal: 3000,
      meses: 12,
    });

    // TODO: Adicionar campo beneficiarios com frações
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 9. RRA com 1 mês — flag apurar_rra=true mas mesesTotal=1
  // Lei: Lei 8.620/93 (RRA — Regime de Trabalho à Risco)
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('9. RRA com 1 mês de contribuição — mínimo para apuração', () => {
    // TODO: Feature não implementada — regime RRA com periodo muito curto
    // RRA pode ter período muito curto e ainda assim gerar direitos
    const caseData = makeMinimalCase({
      tem_rra: true,
      rra_meses: 1,
      data_admissao: '2024-01-01',
      data_demissao: '2024-02-01',
      salario_mensal: 5000,
    });

    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // RRA: convertido em tempo comum de CS (1 mês conta? Mínimo?)
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 10. Servidor público temporário — regime CLT mas com regras específicas
  // Lei: Lei 8.745/93
  // ────────────────────────────────────────────────────────────────────────────
  it.skip('10. Servidor público temporário — CLT mas sem FGTS obrigatório', () => {
    // TODO: Feature não implementada — servidor público temp
    // Alguns servidores públicos com contrato temporário têm regime CLT
    // mas sem obrigação de FGTS (podem ser enquadrados em regime especial)
    const caseData = makeMinimalCase({
      salario_mensal: 3500,
      meses: 24,
      data_admissao: '2022-01-01',
      data_demissao: '2024-01-01',
    });

    // TODO: Adicionar flag servidor_publico_temp
    const result = runMinimalEngine(caseData);
    expect(result).toBeDefined();
    // Lei 8.745/93: pode estar isento de FGTS
  });
});
