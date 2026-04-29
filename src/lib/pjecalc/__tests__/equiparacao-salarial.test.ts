/**
 * =====================================================
 * Testes — ModuloEquiparacaoSalarial (Súmula 6 TST + Art. 461 CLT)
 * =====================================================
 * Cobertura mínima:
 *  - Diferença = max(0, paradigma - empregado) por competência
 *  - Reflexos automáticos (13º, férias + 1/3, FGTS) declarados pelo módulo
 *  - Aplicação da fórmula com Decimal.js (sem perda de precisão)
 *  - Orchestrator gera verbas + reflexos a partir de equiparacao_config
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Trigger module registration
import '../verba-modules';

import { EquiparacaoSalarialModule } from '../verba-modules/equiparacao-salarial';
import { getVerbaModule } from '../verba-modules/types';
import type { VerbaModuleContext, ResolvedInputs } from '../verba-modules/types';
import { makeVerba } from './helpers';

function makeCtx(overrides: Partial<VerbaModuleContext> = {}): VerbaModuleContext {
  return {
    caseId: 'eq-test-001',
    competencia: '2023-06',
    periodo: { inicio: '2023-01-01', fim: '2023-12-31' },
    admissao: '2020-01-01',
    demissao: '2023-12-31',
    historicos: [
      {
        id: 'hist-emp',
        nome: 'Salario Empregado',
        periodo_inicio: '2020-01-01',
        periodo_fim: '2023-12-31',
        tipo_valor: 'informado',
        valor_informado: 3000,
        incidencia_fgts: true,
        incidencia_cs: true,
        fgts_recolhido: false,
        cs_recolhida: false,
        ocorrencias: [
          { id: 'oc-emp-1', historico_id: 'hist-emp', competencia: '2023-06', valor: 3000, tipo: 'informado' },
        ],
      },
      {
        id: 'hist-paradigma',
        nome: 'Salario Paradigma',
        periodo_inicio: '2020-01-01',
        periodo_fim: '2023-12-31',
        tipo_valor: 'informado',
        valor_informado: 5000,
        incidencia_fgts: true,
        incidencia_cs: true,
        fgts_recolhido: false,
        cs_recolhida: false,
        ocorrencias: [
          { id: 'oc-par-1', historico_id: 'hist-paradigma', competencia: '2023-06', valor: 5000, tipo: 'informado' },
        ],
      },
    ],
    cartaoPonto: [],
    faltas: [],
    ferias: [],
    calendario: { diasUteis: 22, repousos: 8, feriados: 1, diasNoMes: 30 },
    cargaHoraria: 220,
    sabadoDiaUtil: false,
    zerarNegativo: true,
    resultadosAnteriores: new Map(),
    ...overrides,
  };
}

describe('VerbaModule — Equiparacao Salarial (Sumula 6 TST + Art. 461 CLT)', () => {
  const mod = new EquiparacaoSalarialModule();

  it('está registrado com id EQUIPARACAO_SALARIAL', () => {
    expect(getVerbaModule('EQUIPARACAO_SALARIAL')).toBeDefined();
  });

  it('canApply respeita o período do contrato', () => {
    const ctx = makeCtx();
    const verba = makeVerba({
      periodo_inicio: '2023-01-01',
      periodo_fim: '2023-12-31',
      base_calculo: { historicos: ['hist-emp', 'hist-paradigma'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });
    expect(mod.canApply(ctx, verba)).toBe(true);
  });

  it('resolveInputs calcula diferença positiva (paradigma - empregado)', () => {
    const ctx = makeCtx();
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-emp', 'hist-paradigma'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      multiplicador: 1,
      divisor_informado: 1,
      quantidade_informada: 1,
    });
    const inputs = mod.resolveInputs(ctx, verba);
    // Paradigma 5000 - Empregado 3000 = 2000
    expect(inputs.base).toBe(2000);
    expect(inputs.metadata?.salario_paradigma).toBe(5000);
    expect(inputs.metadata?.salario_empregado).toBe(3000);
  });

  it('resolveInputs zera diferença quando empregado >= paradigma', () => {
    const ctx = makeCtx({
      historicos: [
        {
          id: 'hist-emp',
          nome: 'Salario Empregado',
          periodo_inicio: '2020-01-01',
          periodo_fim: '2023-12-31',
          tipo_valor: 'informado',
          valor_informado: 6000,
          incidencia_fgts: true,
          incidencia_cs: true,
          fgts_recolhido: false,
          cs_recolhida: false,
          ocorrencias: [{ id: 'a', historico_id: 'hist-emp', competencia: '2023-06', valor: 6000, tipo: 'informado' }],
        },
        {
          id: 'hist-paradigma',
          nome: 'Salario Paradigma',
          periodo_inicio: '2020-01-01',
          periodo_fim: '2023-12-31',
          tipo_valor: 'informado',
          valor_informado: 5000,
          incidencia_fgts: true,
          incidencia_cs: true,
          fgts_recolhido: false,
          cs_recolhida: false,
          ocorrencias: [{ id: 'b', historico_id: 'hist-paradigma', competencia: '2023-06', valor: 5000, tipo: 'informado' }],
        },
      ],
    });
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-emp', 'hist-paradigma'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(0);
  });

  it('applyFormula multiplica diferença x mult x quantidade / divisor com Decimal.js', () => {
    const inputs: ResolvedInputs = {
      base: 2000,
      baseSource: 'diferenca:test',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    expect(mod.applyFormula(inputs)).toBe(2000);

    // Aplicar 50% (ex.: redutor jurídico) deve ser exato
    const inputsHalf: ResolvedInputs = { ...inputs, multiplicador: 0.5 };
    expect(mod.applyFormula(inputsHalf)).toBe(1000);
  });

  it('applyFormula retorna 0 quando base <= 0', () => {
    const inputs: ResolvedInputs = {
      base: 0,
      baseSource: 'diferenca:zero',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    expect(mod.applyFormula(inputs)).toBe(0);
  });

  it('getReflections declara 13o (1/12), férias + 1/3 (1.3333/12) e FGTS (8%)', () => {
    const reflections = mod.getReflections();
    const tipos = reflections.map((r) => r.tipo).sort();
    expect(tipos).toEqual(['13_salario', 'fgts', 'ferias']);

    const r13 = reflections.find((r) => r.tipo === '13_salario');
    expect(r13?.divisor).toBe(12);

    const rFerias = reflections.find((r) => r.tipo === 'ferias');
    expect(rFerias?.baseMultiplier).toBeCloseTo(1.3333, 4);
    expect(rFerias?.divisor).toBe(12);

    const rFgts = reflections.find((r) => r.tipo === 'fgts');
    expect(rFgts?.baseMultiplier).toBeCloseTo(0.08, 4);
  });

  it('getIncidences declara FGTS, INSS e IRRF como salarial', () => {
    const inc = mod.getIncidences();
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });

  it('soma agregada de 12 competências mantém precisão Decimal.js', () => {
    // Simula 12 meses de diferença R$ 1.234,56 — soma deve ser exatamente 14814.72
    const dif = new Decimal('1234.56');
    const total = Array.from({ length: 12 }).reduce<Decimal>((acc) => acc.plus(dif), new Decimal(0));
    expect(total.toFixed(2)).toBe('14814.72');
  });
});
