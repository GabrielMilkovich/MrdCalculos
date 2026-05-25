/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import type { PjecalcMultasConfigRow } from '../types';
import { multasConfigToVerbas } from '../orchestrator';
import { makeParams } from './helpers';

function getVerbas(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'verbas' in result) return (result as { verbas: unknown[] }).verbas;
  return [];
}

function makeCfg(insalubridade_config: Record<string, unknown>): PjecalcMultasConfigRow {
  return {
    id: 'test-id',
    case_id: 'test-case',
    multa_477: false,
    multa_467: false,
    created_at: new Date().toISOString(),
    insalubridade_config,
  } as unknown as PjecalcMultasConfigRow;
}

describe('Insalubridade SM dinâmico', () => {
  const params = makeParams();

  it('insalubridade grau médio 20% em 2024 (SM=1412) → R$ 282.40/mês', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2024-01-01',
      periodo_fim: '2024-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find((v: any) => v.id === 'insalubridade_auto') as any;
    expect(principal).toBeDefined();
    expect(principal.valor_informado_devido).toBe(
      new Decimal('1412').times('0.20').toDP(2).toNumber()
    ); // 282.40
  });

  it('insalubridade grau médio 20% em 2025 (SM=1518) → R$ 303.60/mês', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2025-01-01',
      periodo_fim: '2025-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find((v: any) => v.id === 'insalubridade_auto') as any;
    expect(principal).toBeDefined();
    expect(principal.valor_informado_devido).toBe(
      new Decimal('1518').times('0.20').toDP(2).toNumber()
    ); // 303.60
  });

  it('SM diferente entre 2024 e 2025 produz valores diferentes', () => {
    const cfg2024 = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2024-01-01',
      periodo_fim: '2024-12-31',
    });
    const cfg2025 = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2025-01-01',
      periodo_fim: '2025-12-31',
    });
    const v2024 = getVerbas(multasConfigToVerbas(cfg2024, params, []));
    const v2025 = getVerbas(multasConfigToVerbas(cfg2025, params, []));

    const p2024 = v2024.find((v: any) => v.id === 'insalubridade_auto') as any;
    const p2025 = v2025.find((v: any) => v.id === 'insalubridade_auto') as any;

    expect(p2024.valor_informado_devido).not.toBe(p2025.valor_informado_devido);
    expect(p2024.valor_informado_devido).toBeLessThan(p2025.valor_informado_devido);
  });

  it('reflexos 13º e férias também usam SM dinâmico', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2024-01-01',
      periodo_fim: '2024-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const r13 = verbas.find((v: any) => v.id === 'insalubridade_reflexo_13') as any;
    const rFerias = verbas.find((v: any) => v.id === 'insalubridade_reflexo_ferias') as any;

    const sm2024 = new Decimal('1412');
    const pct = new Decimal('0.20');

    expect(r13.valor_informado_devido).toBe(sm2024.times(pct).div(12).toDP(2).toNumber());
    expect(rFerias.valor_informado_devido).toBe(
      sm2024.times(pct).times('1.3333').div(12).toDP(2).toNumber()
    );
  });
});
