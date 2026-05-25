// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { multasConfigToVerbas } from '../orchestrator';
import type { PjeParametros, PjeHistoricoSalarial } from '../engine-types';

const baseParams = (): PjeParametros => ({
  case_id: 'warn-test',
  data_admissao: '2020-01-01',
  data_demissao: '2023-06-30',
  data_ajuizamento: '2023-07-10',
  estado: 'SP',
  municipio: 'SAO PAULO',
  regime_trabalho: 'tempo_integral',
  carga_horaria_padrao: 220,
  prescricao_quinquenal: false,
  prescricao_fgts: false,
  projetar_aviso_indenizado: false,
  limitar_avos_periodo: false,
  zerar_valor_negativo: false,
  sabado_dia_util: true,
  considerar_feriado_estadual: false,
  considerar_feriado_municipal: false,
  prazo_aviso_previo: 'nao_apurar',
});

const baseHistorico = (): PjeHistoricoSalarial => ({
  id: 'h1',
  nome: 'Salário Base',
  periodo_inicio: '2020-01-01',
  periodo_fim: '2023-06-30',
  tipo_valor: 'informado',
  valor_informado: 3000,
  incidencia_fgts: true,
  incidencia_cs: true,
  fgts_recolhido: false,
  cs_recolhida: false,
  ocorrencias: [],
});

describe('orchestrator warning emissions', () => {
  it('emits W_ESTABILIDADE_MESES_ZERO for active estabilidade without meses and tipo=outro', () => {
    const cfg = {
      apurar_467: false,
      apurar_477: false,
      estabilidade_config: {
        ativo: true,
        tipo: 'outro',
        meses_estabilidade: 0,
        data_evento: '2023-01-15',
        periodo_inicio: '',
        periodo_fim: '',
      },
    } as unknown as import('../types').PjecalcMultasConfigRow;

    const result = multasConfigToVerbas(cfg, baseParams(), [baseHistorico()]);
    const warnCodes = result.warnings.map(w => w.code);
    expect(warnCodes).toContain('W_ESTABILIDADE_MESES_ZERO');
  });

  it('does NOT emit W_ESTABILIDADE_MESES_ZERO for gestante (has legal default of 5 months)', () => {
    const cfg = {
      apurar_467: false,
      apurar_477: false,
      estabilidade_config: {
        ativo: true,
        tipo: 'gestante',
        meses_estabilidade: 0,
        data_evento: '2023-01-15',
        periodo_inicio: '',
        periodo_fim: '',
      },
    } as unknown as import('../types').PjecalcMultasConfigRow;

    const result = multasConfigToVerbas(cfg, baseParams(), [baseHistorico()]);
    const warnCodes = result.warnings.map(w => w.code);
    expect(warnCodes).not.toContain('W_ESTABILIDADE_MESES_ZERO');
  });

  it('emits W_INSALUBRIDADE_SM_FALLBACK for insalubridade with salario_minimo base', () => {
    const cfg = {
      apurar_467: false,
      apurar_477: false,
      insalubridade_config: {
        ativo: true,
        grau: 'minimo_10',
        base_calculo: 'salario_minimo',
        periodo_inicio: '2020-01-01',
        periodo_fim: '2023-06-30',
      },
    } as unknown as import('../types').PjecalcMultasConfigRow;

    const result = multasConfigToVerbas(cfg, baseParams(), [baseHistorico()]);
    const warnCodes = result.warnings.map(w => w.code);
    expect(warnCodes).toContain('W_INSALUBRIDADE_SM_FALLBACK');
  });

  it('does NOT emit W_INSALUBRIDADE_SM_FALLBACK for insalubridade with salario_base', () => {
    const cfg = {
      apurar_467: false,
      apurar_477: false,
      insalubridade_config: {
        ativo: true,
        grau: 'medio_20',
        base_calculo: 'salario_base',
        periodo_inicio: '2020-01-01',
        periodo_fim: '2023-06-30',
      },
    } as unknown as import('../types').PjecalcMultasConfigRow;

    const result = multasConfigToVerbas(cfg, baseParams(), [baseHistorico()]);
    const warnCodes = result.warnings.map(w => w.code);
    expect(warnCodes).not.toContain('W_INSALUBRIDADE_SM_FALLBACK');
  });

  it('returns no warnings for clean config (no estabilidade, no insalubridade)', () => {
    const cfg = {
      apurar_467: true,
      apurar_477: false,
    } as unknown as import('../types').PjecalcMultasConfigRow;

    const result = multasConfigToVerbas(cfg, baseParams(), [baseHistorico()]);
    expect(result.warnings).toEqual([]);
  });

  it('returns empty when multasConfig is null', () => {
    const result = multasConfigToVerbas(null, baseParams(), [baseHistorico()]);
    expect(result.verbas).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
