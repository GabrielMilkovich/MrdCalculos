/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import type { PjeVerba } from '../engine-types';
import type { PjecalcMultasConfigRow } from '../types';
import { multasConfigToVerbas } from '../orchestrator';
import { makeParams, makeHistorico } from './helpers';

// ── Compat shim: Track C may change the return type ──
function getVerbas(result: unknown): PjeVerba[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'verbas' in result) return (result as { verbas: PjeVerba[] }).verbas;
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

const SM_2023 = new Decimal('1320');
const SM_2025 = new Decimal('1518');

describe('Insalubridade — multasConfigToVerbas', () => {
  const params = makeParams();

  // 1. Grau mínimo 10% sobre SM (2023 → SM=1320)
  it('grau minimo_10 sobre salario_minimo 2023 → valor_informado_devido = 132.00', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'minimo_10',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor).toBe('informado');
    expect(principal!.valor_informado_devido).toBe(SM_2023.times(new Decimal('0.10')).toDP(2).toNumber());
  });

  // 2. Grau médio 20% sobre SM (2023 → SM=1320)
  it('grau medio_20 sobre salario_minimo 2023 → valor_informado_devido = 264.00', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor_informado_devido).toBe(SM_2023.times(new Decimal('0.20')).toDP(2).toNumber());
  });

  // 3. Grau máximo 40% sobre SM (2023 → SM=1320)
  it('grau maximo_40 sobre salario_minimo 2023 → valor_informado_devido = 528.00', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'maximo_40',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor_informado_devido).toBe(SM_2023.times(new Decimal('0.40')).toDP(2).toNumber());
  });

  // 4. Base = salario_base → uses only historicos with "fix" or "base" in name
  it('base_calculo = salario_base → filters historicos by name containing fix/base/salario', () => {
    const histBase = makeHistorico({ id: 'hist-base', nome: 'Salario Base', valor_informado: 3000 });
    const histComissao = makeHistorico({ id: 'hist-comissao', nome: 'Comissao Vendas', valor_informado: 1000 });
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_base',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, [histBase, histComissao]));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor).toBe('calculado');
    // Should only include histBase (contains "base" / "salario")
    expect(principal!.base_calculo.historicos).toEqual(['hist-base']);
  });

  // 5. Base = salario_contratual → uses all historicos
  it('base_calculo = salario_contratual → uses all historicos', () => {
    const hist1 = makeHistorico({ id: 'hist-1', nome: 'Salario Base', valor_informado: 3000 });
    const hist2 = makeHistorico({ id: 'hist-2', nome: 'Gratificacao', valor_informado: 500 });
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_contratual',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, [hist1, hist2]));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor).toBe('calculado');
    expect(principal!.base_calculo.historicos).toEqual(['hist-1', 'hist-2']);
  });

  // 6. Reflexos em 13º e férias+1/3 present
  it('generates reflexos em 13o and ferias+1/3', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const reflexo13 = verbas.find(v => v.id === 'insalubridade_reflexo_13');
    const reflexoFerias = verbas.find(v => v.id === 'insalubridade_reflexo_ferias');
    expect(reflexo13).toBeDefined();
    expect(reflexoFerias).toBeDefined();

    // 13º: SM_2023 × 20% / 12
    const expected13 = SM_2023.times(new Decimal('0.20')).div(12).toDP(2).toNumber();
    expect(reflexo13!.valor_informado_devido).toBe(expected13);

    // Férias + 1/3: SM_2023 × 20% × 1.3333 / 12
    const expectedFerias = SM_2023.times(new Decimal('0.20')).times(new Decimal('1.3333')).div(12).toDP(2).toNumber();
    expect(reflexoFerias!.valor_informado_devido).toBe(expectedFerias);
  });

  // 7. Incidências FGTS/IRPF/CS = true
  it('incidencias fgts, irpf, contribuicao_social are true on principal verba', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.incidencias.fgts).toBe(true);
    expect(principal!.incidencias.irpf).toBe(true);
    expect(principal!.incidencias.contribuicao_social).toBe(true);
    expect(principal!.incidencias.previdencia_privada).toBe(false);
    expect(principal!.incidencias.pensao_alimenticia).toBe(false);
  });

  // 8. Invalid grau → percentual = 0
  it('invalid grau → percentual = 0 → valor_informado_devido = 0', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'invalido_99',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const principal = verbas.find(v => v.id === 'insalubridade_auto');
    expect(principal).toBeDefined();
    expect(principal!.valor_informado_devido).toBe(0);
  });

  // 9. ativo = false → no verbas generated
  it('ativo = false → no insalubridade verbas generated', () => {
    const cfg = makeCfg({
      ativo: false,
      grau: 'medio_20',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    const insVerbas = verbas.filter(v => v.id.startsWith('insalubridade'));
    expect(insVerbas).toHaveLength(0);
  });

  // 10. DSR reflexo only generated when historicos have variable component
  it('DSR reflexo is generated when historicos have comissao/variavel', () => {
    const histComissao = makeHistorico({ id: 'hist-comissao', nome: 'Comissao Vendas', valor_informado: 1000 });
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_contratual',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, [histComissao]));
    const dsr = verbas.find(v => v.id === 'insalubridade_reflexo_dsr');
    expect(dsr).toBeDefined();
    expect(dsr!.ocorrencia_pagamento).toBe('mensal');
  });

  // 11. DSR reflexo NOT generated when historicos only have fixed salary
  it('DSR reflexo NOT generated when historicos only have fixed salary', () => {
    const histFixo = makeHistorico({ id: 'hist-fixo', nome: 'Salario Fixo', valor_informado: 3000 });
    const cfg = makeCfg({
      ativo: true,
      grau: 'medio_20',
      base_calculo: 'salario_base',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, [histFixo]));
    const dsr = verbas.find(v => v.id === 'insalubridade_reflexo_dsr');
    expect(dsr).toBeUndefined();
  });

  // 12. Ordem values are correct
  it('ordem values: principal=9024, 13o=9025, ferias=9026', () => {
    const cfg = makeCfg({
      ativo: true,
      grau: 'minimo_10',
      base_calculo: 'salario_minimo',
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
    });
    const verbas = getVerbas(multasConfigToVerbas(cfg, params, []));
    expect(verbas.find(v => v.id === 'insalubridade_auto')!.ordem).toBe(9024);
    expect(verbas.find(v => v.id === 'insalubridade_reflexo_13')!.ordem).toBe(9025);
    expect(verbas.find(v => v.id === 'insalubridade_reflexo_ferias')!.ordem).toBe(9026);
  });
});
