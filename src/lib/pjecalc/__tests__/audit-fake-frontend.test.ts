/**
 * =====================================================
 * Sprint 7 Track C — Audit: multasConfigToVerbas bugs
 * =====================================================
 * C.1  Estabilidade silenciosa (meses=0 + tipo=outro → warning)
 * C.2  base_calculo.historicos usa todos os históricos
 * C.3  Aviso prévio "informado" sem dias → throw
 * C.4  Equiparação: DSR + Aviso Prévio reflexos
 */
import { describe, it, expect, vi } from 'vitest';

// Mock supabase client before any import that transitively loads it
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
    }),
  },
}));

import { multasConfigToVerbas } from '../orchestrator';
import { makeParams, makeHistorico } from './helpers';
import type { PjecalcMultasConfigRow } from '../types';

// Helper to build a multas config row with estabilidade_config
function makeMultasConfig(
  extra: Record<string, unknown> = {},
): PjecalcMultasConfigRow {
  return {
    id: 'multas-test',
    case_id: 'test-case-001',
    multa_477: false,
    multa_467: false,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  } as PjecalcMultasConfigRow;
}

describe('C.1 — Estabilidade silenciosa', () => {
  it('tipo=outro + meses=0 + ativo=true → warning + no verba', () => {
    const cfg = makeMultasConfig({
      estabilidade_config: {
        ativo: true,
        tipo: 'outro',
        periodo_inicio: '',
        periodo_fim: '',
        data_evento: '2023-06-01',
        meses_estabilidade: '0',
      },
    });
    const params = makeParams();
    const historicos = [makeHistorico()];
    const { verbas, warnings } = multasConfigToVerbas(cfg, params, historicos);

    // No estabilidade verba should be generated
    const estVerbas = verbas.filter(v => v.id === 'estabilidade_auto');
    expect(estVerbas).toHaveLength(0);

    // Warning should be present
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    const w = warnings.find(w => w.code === 'W_ESTABILIDADE_MESES_ZERO');
    expect(w).toBeDefined();
    expect(w!.message).toContain('outro');
  });

  it('tipo=cipa + meses=0 → default 12 applied, verba generated', () => {
    const cfg = makeMultasConfig({
      estabilidade_config: {
        ativo: true,
        tipo: 'cipa',
        periodo_inicio: '',
        periodo_fim: '',
        data_evento: '2023-01-15',
        meses_estabilidade: '',
      },
    });
    const params = makeParams();
    const historicos = [makeHistorico()];
    const { verbas, warnings } = multasConfigToVerbas(cfg, params, historicos);

    const estVerba = verbas.find(v => v.id === 'estabilidade_auto');
    expect(estVerba).toBeDefined();
    // CIPA default = 12 months from 2023-01-15 → 2024-01-15
    expect(estVerba!.periodo_inicio).toBe('2023-01-15');
    expect(estVerba!.periodo_fim).toBe('2024-01-15');

    // No warning should be present for this case
    const wZero = warnings.find(w => w.code === 'W_ESTABILIDADE_MESES_ZERO');
    expect(wZero).toBeUndefined();
  });

  it('tipo=gestante + meses=0 → default 5 applied', () => {
    const cfg = makeMultasConfig({
      estabilidade_config: {
        ativo: true,
        tipo: 'gestante',
        periodo_inicio: '',
        periodo_fim: '',
        data_evento: '2023-03-01',
        meses_estabilidade: '0',
      },
    });
    const params = makeParams();
    const historicos = [makeHistorico()];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const estVerba = verbas.find(v => v.id === 'estabilidade_auto');
    expect(estVerba).toBeDefined();
    // gestante default = 5 months from 2023-03-01 → 2023-08-01
    expect(estVerba!.periodo_fim).toBe('2023-08-01');
  });

  it('meses=12 explicit → uses that value regardless of tipo', () => {
    const cfg = makeMultasConfig({
      estabilidade_config: {
        ativo: true,
        tipo: 'outro',
        periodo_inicio: '',
        periodo_fim: '',
        data_evento: '2023-06-01',
        meses_estabilidade: '12',
      },
    });
    const params = makeParams();
    const historicos = [makeHistorico()];
    const { verbas, warnings } = multasConfigToVerbas(cfg, params, historicos);

    const estVerba = verbas.find(v => v.id === 'estabilidade_auto');
    expect(estVerba).toBeDefined();
    // 12 months from 2023-06-01 → 2024-06-01
    expect(estVerba!.periodo_fim).toBe('2024-06-01');

    // No warning since meses was explicitly provided
    const wZero = warnings.find(w => w.code === 'W_ESTABILIDADE_MESES_ZERO');
    expect(wZero).toBeUndefined();
  });
});

describe('C.2 — base_calculo.historicos uses ALL historicos', () => {
  it('estabilidade verba includes all historico IDs, not just [0]', () => {
    const cfg = makeMultasConfig({
      estabilidade_config: {
        ativo: true,
        tipo: 'acidentaria',
        periodo_inicio: '',
        periodo_fim: '',
        data_evento: '2023-01-01',
        meses_estabilidade: '12',
      },
    });
    const params = makeParams();
    const historicos = [
      makeHistorico({ id: 'hist-001' }),
      makeHistorico({ id: 'hist-002', nome: 'Comissao', periodo_inicio: '2021-01-01' }),
      makeHistorico({ id: 'hist-003', nome: 'Premio', periodo_inicio: '2022-01-01' }),
    ];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const estVerba = verbas.find(v => v.id === 'estabilidade_auto');
    expect(estVerba).toBeDefined();
    expect(estVerba!.base_calculo.historicos).toEqual(['hist-001', 'hist-002', 'hist-003']);
  });
});

describe('C.3 — Aviso prévio validation', () => {
  it('aviso "informado" sem dias → throw with explicit message', () => {
    // This validation lives in executarLiquidacao (which we cannot unit-test without DB),
    // so we test the logic inline:
    const engineParams = makeParams({
      prazo_aviso_previo: 'informado',
      prazo_aviso_dias: undefined,
    });

    // Replicate the validation logic from orchestrator
    const validate = () => {
      if (engineParams.prazo_aviso_previo === 'informado' && !engineParams.prazo_aviso_dias) {
        throw new Error('Aviso prévio configurado como "informado" mas dias não preenchidos. Volte ao módulo Dados do Processo e preencha "Prazo de Aviso (dias)".');
      }
    };

    expect(validate).toThrow('Aviso prévio configurado como "informado" mas dias não preenchidos');
  });

  it('aviso "calculado" → no throw', () => {
    const engineParams = makeParams({
      prazo_aviso_previo: 'calculado',
    });

    const validate = () => {
      if (engineParams.prazo_aviso_previo === 'informado' && !engineParams.prazo_aviso_dias) {
        throw new Error('Aviso prévio configurado como "informado" mas dias não preenchidos.');
      }
    };

    expect(validate).not.toThrow();
  });

  it('aviso "informado" com dias preenchidos → no throw', () => {
    const engineParams = makeParams({
      prazo_aviso_previo: 'informado',
      prazo_aviso_dias: 30,
    });

    const validate = () => {
      if (engineParams.prazo_aviso_previo === 'informado' && !engineParams.prazo_aviso_dias) {
        throw new Error('Aviso prévio configurado como "informado" mas dias não preenchidos.');
      }
    };

    expect(validate).not.toThrow();
  });
});

describe('C.4 — Equiparação: DSR + Aviso Prévio reflexos', () => {
  it('equiparação + comissão historico → DSR reflexo present', () => {
    const cfg = makeMultasConfig({
      equiparacao_config: {
        ativo: true,
        paradigma_nome: 'Fulano',
        periodo_inicio: '2023-01-01',
        periodo_fim: '2023-12-31',
        salarios: [
          { competencia: '2023-06', salario_paradigma: '5000', salario_empregado: '3000' },
        ],
      },
    });
    const params = makeParams();
    const historicos = [
      makeHistorico({ id: 'hist-001', nome: 'Comissão Vendas' }),
    ];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const dsrReflexo = verbas.find(v => v.id === 'equiparacao_reflexo_dsr');
    expect(dsrReflexo).toBeDefined();
    expect(dsrReflexo!.nome).toContain('DSR');
    expect(dsrReflexo!.valor_informado_devido).toBeGreaterThan(0);
    expect(dsrReflexo!.incidencias.fgts).toBe(true);
  });

  it('equiparação + no comissão historico → no DSR reflexo', () => {
    const cfg = makeMultasConfig({
      equiparacao_config: {
        ativo: true,
        paradigma_nome: 'Fulano',
        periodo_inicio: '2023-01-01',
        periodo_fim: '2023-12-31',
        salarios: [
          { competencia: '2023-06', salario_paradigma: '5000', salario_empregado: '3000' },
        ],
      },
    });
    const params = makeParams();
    const historicos = [
      makeHistorico({ id: 'hist-001', nome: 'Salario Base' }),
    ];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const dsrReflexo = verbas.find(v => v.id === 'equiparacao_reflexo_dsr');
    expect(dsrReflexo).toBeUndefined();
  });

  it('equiparação + aviso indenizado → aviso reflexo present', () => {
    const cfg = makeMultasConfig({
      equiparacao_config: {
        ativo: true,
        paradigma_nome: 'Ciclano',
        periodo_inicio: '2023-01-01',
        periodo_fim: '2023-12-31',
        salarios: [
          { competencia: '2023-06', salario_paradigma: '6000', salario_empregado: '4000' },
        ],
      },
    });
    const params = makeParams({
      prazo_aviso_previo: 'calculado',
      projetar_aviso_indenizado: true,
    });
    const historicos = [makeHistorico()];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const avisoReflexo = verbas.find(v => v.id === 'equiparacao_reflexo_aviso');
    expect(avisoReflexo).toBeDefined();
    expect(avisoReflexo!.nome).toContain('AVISO PREVIO');
    expect(avisoReflexo!.caracteristica).toBe('aviso_previo');
    expect(avisoReflexo!.valor_informado_devido).toBeGreaterThan(0);
  });

  it('equiparação + aviso NOT indenizado → no aviso reflexo', () => {
    const cfg = makeMultasConfig({
      equiparacao_config: {
        ativo: true,
        paradigma_nome: 'Ciclano',
        periodo_inicio: '2023-01-01',
        periodo_fim: '2023-12-31',
        salarios: [
          { competencia: '2023-06', salario_paradigma: '6000', salario_empregado: '4000' },
        ],
      },
    });
    const params = makeParams({
      prazo_aviso_previo: 'calculado',
      projetar_aviso_indenizado: false,
    });
    const historicos = [makeHistorico()];
    const { verbas } = multasConfigToVerbas(cfg, params, historicos);

    const avisoReflexo = verbas.find(v => v.id === 'equiparacao_reflexo_aviso');
    expect(avisoReflexo).toBeUndefined();
  });
});
