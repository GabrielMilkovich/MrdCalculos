/**
 * Tests for periculosidade (hazard pay) reflexos in multasConfigToVerbas.
 * Art. 193 CLT — Adicional de Periculosidade + reflexos (13º, férias+1/3, DSR).
 */
import { describe, it, expect, vi } from 'vitest';
import Decimal from 'decimal.js';

// Mock the supabase client to avoid localStorage dependency in Node test env
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ data: [], error: null }) }),
    rpc: () => ({ data: null, error: null }),
  },
}));
import type { PjeVerba, PjeHistoricoSalarial } from '../engine-types';
import type { PjecalcMultasConfigRow } from '../types';
import { multasConfigToVerbas } from '../orchestrator';
import { makeParams, makeHistorico } from './helpers';

// ── Helper: extract verbas from result (handles both old PjeVerba[] and new {verbas, warnings}) ──
function getVerbas(result: PjeVerba[] | { verbas: PjeVerba[] }): PjeVerba[] {
  return Array.isArray(result) ? result : result.verbas;
}

// ── Factory: minimal multas config with periculosidade ──
function makeMultasConfig(periculosidadeOverrides: Record<string, unknown> = {}): PjecalcMultasConfigRow {
  return {
    id: 'multas-001',
    case_id: 'case-001',
    multa_477: false,
    multa_467: false,
    created_at: '2025-01-01T00:00:00Z',
    // Injected as dynamic property — function casts to Record<string, unknown>
    periculosidade_config: {
      ativo: true,
      percentual: '30',
      periodo_inicio: '2022-01-01',
      periodo_fim: '2023-12-31',
      base_calculo: 'salario_base',
      ...periculosidadeOverrides,
    },
  } as unknown as PjecalcMultasConfigRow;
}

function findVerba(verbas: PjeVerba[], id: string): PjeVerba | undefined {
  return verbas.find(v => v.id === id);
}

describe('Periculosidade reflexos (Art. 193 CLT)', () => {
  const params = makeParams({
    data_admissao: '2020-01-01',
    data_demissao: '2023-12-31',
  });

  const defaultHistorico = makeHistorico({
    id: 'hist-001',
    nome: 'Salario Base',
    valor_informado: 3000,
  });

  // ── Test 1: Periculosidade ativa sem histórico ──
  it('should create verba principal even without historicos', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, []);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal).toBeDefined();
    expect(principal!.base_calculo.historicos).toEqual([]);
  });

  // ── Test 2: Periculosidade 30% → multiplicador 0.3 ──
  it('should set multiplicador to 0.3 for 30% periculosidade', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal).toBeDefined();
    expect(principal!.multiplicador).toBeCloseTo(0.3, 10);
    expect(principal!.valor).toBe('calculado');
  });

  // ── Test 3: Gera reflexo em 13º ──
  it('should generate reflexo em 13º salário', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    expect(reflexo13).toBeDefined();
    expect(reflexo13!.nome).toBe('REFLEXO PERICULOSIDADE EM 13º SALÁRIO');
    expect(reflexo13!.valor).toBe('calculado');
  });

  // ── Test 4: Reflexo férias+1/3 com multiplicador correto ──
  it('should generate reflexo férias+1/3 with correct multiplicador (0.30 × 1.3333 / 12)', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const reflexoFerias = findVerba(verbas, 'periculosidade_reflexo_ferias');
    expect(reflexoFerias).toBeDefined();

    const expected = new Decimal('0.30').times('1.3333').div(12).toNumber();
    expect(reflexoFerias!.multiplicador).toBeCloseTo(expected, 10);
  });

  // ── Test 5: Sem variável no salário → SEM reflexo DSR ──
  it('should NOT generate DSR reflexo when historico has no variable compensation', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const reflexoDsr = findVerba(verbas, 'periculosidade_reflexo_dsr');
    expect(reflexoDsr).toBeUndefined();
  });

  // ── Test 6: Com comissões → COM reflexo DSR ──
  it('should generate DSR reflexo when historico nome contains "comiss"', () => {
    const historicoComissao = makeHistorico({
      id: 'hist-comissao',
      nome: 'Comissão sobre vendas',
      valor_informado: 1500,
    });
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico, historicoComissao]);
    const verbas = getVerbas(result);

    const reflexoDsr = findVerba(verbas, 'periculosidade_reflexo_dsr');
    expect(reflexoDsr).toBeDefined();
    expect(reflexoDsr!.nome).toBe('REFLEXO PERICULOSIDADE EM DSR');
    expect(reflexoDsr!.ocorrencia_pagamento).toBe('mensal');
  });

  // ── Test 7: base_calculo.historicos uses ALL historicos (multi-historico) ──
  it('should include ALL historico IDs in base_calculo.historicos', () => {
    const hist1 = makeHistorico({ id: 'hist-001', nome: 'Salario Base', valor_informado: 3000 });
    const hist2 = makeHistorico({ id: 'hist-002', nome: 'Gratificação', valor_informado: 500 });
    const hist3 = makeHistorico({ id: 'hist-003', nome: 'Adicional Noturno', valor_informado: 200 });

    const result = multasConfigToVerbas(makeMultasConfig(), params, [hist1, hist2, hist3]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal).toBeDefined();
    expect(principal!.base_calculo.historicos).toEqual(['hist-001', 'hist-002', 'hist-003']);

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    expect(reflexo13!.base_calculo.historicos).toEqual(['hist-001', 'hist-002', 'hist-003']);

    const reflexoFerias = findVerba(verbas, 'periculosidade_reflexo_ferias');
    expect(reflexoFerias!.base_calculo.historicos).toEqual(['hist-001', 'hist-002', 'hist-003']);
  });

  // ── Test 8: gerar_verba_reflexa da verba principal é 'devido' ──
  it('should set gerar_verba_reflexa to "devido" on verba principal', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal).toBeDefined();
    expect(principal!.gerar_verba_reflexa).toBe('devido');
  });

  // ── Test 9: ocorrencia_pagamento correct per verba type ──
  it('should set ocorrencia_pagamento="desligamento" for 13º and férias, "mensal" for DSR', () => {
    const historicoComissao = makeHistorico({
      id: 'hist-comissao',
      nome: 'Comissão sobre vendas',
      valor_informado: 1500,
    });
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico, historicoComissao]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal!.ocorrencia_pagamento).toBe('mensal');

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    expect(reflexo13!.ocorrencia_pagamento).toBe('desligamento');

    const reflexoFerias = findVerba(verbas, 'periculosidade_reflexo_ferias');
    expect(reflexoFerias!.ocorrencia_pagamento).toBe('desligamento');

    const reflexoDsr = findVerba(verbas, 'periculosidade_reflexo_dsr');
    expect(reflexoDsr!.ocorrencia_pagamento).toBe('mensal');
  });

  // ── Test 10: Incidências FGTS, IRPF, CS = true em todos os reflexos ──
  it('should set fgts=true, irpf=true, contribuicao_social=true on all reflexos', () => {
    const historicoComissao = makeHistorico({
      id: 'hist-comissao',
      nome: 'Comissão sobre vendas',
      valor_informado: 1500,
    });
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico, historicoComissao]);
    const verbas = getVerbas(result);

    const periculosidadeVerbas = verbas.filter(v => v.id.startsWith('periculosidade'));
    expect(periculosidadeVerbas.length).toBeGreaterThanOrEqual(4); // principal + 13 + ferias + dsr

    for (const verba of periculosidadeVerbas) {
      expect(verba.incidencias.fgts).toBe(true);
      expect(verba.incidencias.irpf).toBe(true);
      expect(verba.incidencias.contribuicao_social).toBe(true);
      expect(verba.incidencias.previdencia_privada).toBe(false);
      expect(verba.incidencias.pensao_alimenticia).toBe(false);
    }
  });

  // ── Test 11: Ordem dos reflexos (9020, 9021, 9022, 9023) ──
  it('should assign correct ordem values to each verba', () => {
    const historicoComissao = makeHistorico({
      id: 'hist-comissao',
      nome: 'Comissão sobre vendas',
      valor_informado: 1500,
    });
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico, historicoComissao]);
    const verbas = getVerbas(result);

    expect(findVerba(verbas, 'periculosidade_auto')!.ordem).toBe(9020);
    expect(findVerba(verbas, 'periculosidade_reflexo_13')!.ordem).toBe(9021);
    expect(findVerba(verbas, 'periculosidade_reflexo_ferias')!.ordem).toBe(9022);
    expect(findVerba(verbas, 'periculosidade_reflexo_dsr')!.ordem).toBe(9023);
  });

  // ── Test 12: Periculosidade with custom percentual (e.g. 20%) ──
  it('should handle custom percentual (e.g. 20%)', () => {
    const config = makeMultasConfig({ percentual: '20' });
    const result = multasConfigToVerbas(config, params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal!.multiplicador).toBeCloseTo(0.2, 10);

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    const expected13 = new Decimal('0.20').div(12).toNumber();
    expect(reflexo13!.multiplicador).toBeCloseTo(expected13, 10);
  });

  // ── Test 13: Periculosidade inativa → nenhuma verba gerada ──
  it('should NOT generate any verbas when periculosidade is inactive', () => {
    const config = makeMultasConfig({ ativo: false });
    const result = multasConfigToVerbas(config, params, []);
    const verbas = getVerbas(result);

    const periculosidadeVerbas = verbas.filter(v => v.id.startsWith('periculosidade'));
    expect(periculosidadeVerbas).toHaveLength(0);
  });

  // ── Test 14: DSR reflexo also triggered by "premia" in historico nome ──
  it('should generate DSR reflexo when historico nome contains "premia"', () => {
    const historicoPremio = makeHistorico({
      id: 'hist-premio',
      nome: 'Premiação trimestral',
      valor_informado: 800,
    });
    const result = multasConfigToVerbas(makeMultasConfig(), params, [historicoPremio]);
    const verbas = getVerbas(result);

    const reflexoDsr = findVerba(verbas, 'periculosidade_reflexo_dsr');
    expect(reflexoDsr).toBeDefined();
  });

  // ── Test 15: 13º multiplicador = percentual / 12 (Decimal precision) ──
  it('should calculate 13º multiplicador with Decimal precision (0.30 / 12)', () => {
    const result = multasConfigToVerbas(makeMultasConfig(), params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    const expected = new Decimal('0.30').div(12).toNumber();
    expect(reflexo13!.multiplicador).toBe(expected);
  });

  // ── Test 16: Uses periodo from config, not from params ──
  it('should use periodo_inicio/periodo_fim from periculosidade_config', () => {
    const config = makeMultasConfig({
      periodo_inicio: '2022-06-01',
      periodo_fim: '2023-06-30',
    });
    const result = multasConfigToVerbas(config, params, [defaultHistorico]);
    const verbas = getVerbas(result);

    const principal = findVerba(verbas, 'periculosidade_auto');
    expect(principal!.periodo_inicio).toBe('2022-06-01');
    expect(principal!.periodo_fim).toBe('2023-06-30');

    const reflexo13 = findVerba(verbas, 'periculosidade_reflexo_13');
    expect(reflexo13!.periodo_inicio).toBe('2022-06-01');
    expect(reflexo13!.periodo_fim).toBe('2023-06-30');
  });
});
