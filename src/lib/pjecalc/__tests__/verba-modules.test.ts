import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Import modules to trigger registration
import '../verba-modules';

import {
  getVerbaModule,
  getAllVerbaModules,
  getModulesInOrder,
} from '../verba-modules/types';
import type { VerbaModuleContext, ResolvedInputs } from '../verba-modules/types';
import type { PjeVerba, PjeHistoricoSalarial, PjeCartaoPonto } from '../engine-types';
import { HorasExtras50Module } from '../verba-modules/horas-extras';
import { DSRModule } from '../verba-modules/dsr';
import { DecimoTerceiroProporcionalModule } from '../verba-modules/decimo-terceiro';
import { FeriasVencidasModule } from '../verba-modules/ferias';
import { Multa467Module, Multa477Module } from '../verba-modules/multas-clt';
import { FGTSDiferencasModule, Multa40FGTSModule } from '../verba-modules/fgts-rescisorio';
import { makeVerba } from './helpers';

function makeContext(overrides: Partial<VerbaModuleContext> = {}): VerbaModuleContext {
  return {
    caseId: 'test-case',
    competencia: '2023-06',
    periodo: { inicio: '2023-01-01', fim: '2023-12-31' },
    admissao: '2020-01-01',
    demissao: '2023-12-31',
    historicos: [{
      id: 'hist-001',
      nome: 'Salario Base',
      periodo_inicio: '2020-01-01',
      periodo_fim: '2023-12-31',
      tipo_valor: 'informado',
      valor_informado: 3000,
      incidencia_fgts: true,
      incidencia_cs: true,
      fgts_recolhido: false,
      cs_recolhida: false,
      ocorrencias: [
        { id: 'oc1', historico_id: 'hist-001', competencia: '2023-06', valor: 3000, tipo: 'informado' },
      ],
    }],
    cartaoPonto: [{
      competencia: '2023-06',
      dias_uteis: 22,
      dias_trabalhados: 22,
      horas_extras_50: 15,
      horas_extras_100: 5,
      horas_noturnas: 0,
      intervalo_suprimido: 0,
      dsr_horas: 0,
      sobreaviso: 0,
    }],
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

describe('VerbaModule - HorasExtras50', () => {
  const mod = new HorasExtras50Module();

  it('module is registered', () => {
    expect(getVerbaModule('HE_50')).toBeDefined();
  });

  it('resolves inputs from cartao de ponto', () => {
    const ctx = makeContext();
    const verba = makeVerba({
      tipo_quantidade: 'cartao_ponto',
      quantidade_cartao_colunas: ['horas_extras_50'],
      tipo_divisor: 'carga_horaria',
      multiplicador: 1.5,
    });

    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(3000);
    expect(inputs.quantidade).toBe(15);
    expect(inputs.multiplicador).toBe(1.5);
  });

  it('applies formula: (Base/Div)*Mult*Qtd with truncation', () => {
    const inputs: ResolvedInputs = {
      base: 3000,
      baseSource: 'test',
      quantidade: 15,
      quantidadeSource: 'test',
      divisor: 220,
      divisorSource: 'test',
      multiplicador: 1.5,
    };

    const result = mod.applyFormula(inputs, makeVerba());
    // 3000/220=13.63, *1.5=20.44, *15=306.60
    expect(result).toBe(306.60);
  });

  it('declares correct reflections (DSR, 13o, Ferias, FGTS)', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(4);
    expect(reflections.map(r => r.tipo)).toContain('dsr');
    expect(reflections.map(r => r.tipo)).toContain('13_salario');
    expect(reflections.map(r => r.tipo)).toContain('ferias');
    expect(reflections.map(r => r.tipo)).toContain('fgts');
  });

  it('declares salarial incidences (FGTS, INSS, IRRF)', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });
});

describe('VerbaModule - DSR', () => {
  const mod = new DSRModule();

  it('module is registered', () => {
    expect(getVerbaModule('DSR')).toBeDefined();
  });

  it('calculates DSR = (soma_HE / dias_uteis) * repousos', () => {
    const heResults = [
      {
        competencia: '2023-06',
        base: 3000, divisor: 220, multiplicador: 1.5, quantidade: 15,
        dobra: 1, devido: 306.60, pago: 0, diferenca: 306.60,
        indice_correcao: 1, valor_corrigido: 306.60, juros: 0, valor_final: 306.60,
        formula: 'test',
      },
    ];

    const ctx = makeContext({
      resultadosAnteriores: new Map([['HE_50', heResults]]),
    });

    const inputs = mod.resolveInputs(ctx, makeVerba());
    // base = 306.60 (HE difference), divisor = 22 (dias uteis), multiplicador = 8 (repousos)
    expect(inputs.base).toBe(306.60);
    expect(inputs.divisor).toBe(22);
    expect(inputs.multiplicador).toBe(8);

    const result = mod.applyFormula(inputs, makeVerba());
    // 306.60 / 22 = 13.93 (truncated), * 8 = 111.44
    expect(result).toBeCloseTo(111.44, 0);
  });

  it('canApply returns false when no HE results', () => {
    const ctx = makeContext();
    expect(mod.canApply(ctx, makeVerba())).toBe(false);
  });
});

describe('VerbaModule - Multas CLT', () => {
  it('Multa 467 = base * 50%', () => {
    const mod = new Multa467Module();
    const inputs = mod.resolveInputs(makeContext(), makeVerba({ valor_informado_devido: 5000 }));
    expect(inputs.multiplicador).toBe(0.5);

    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(2500);
  });

  it('Multa 477 = 1x remuneracao', () => {
    const mod = new Multa477Module();
    const ctx = makeContext();
    const verba = makeVerba({ valor_informado_devido: 3000 });

    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.multiplicador).toBe(1);
    expect(inputs.base).toBe(3000);

    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(3000);
  });

  it('Multa 467 has indenizatoria nature (no FGTS/INSS/IR)', () => {
    const mod = new Multa467Module();
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });
});

describe('VerbaModule - FGTS Rescisorio', () => {
  it('calculates 8% FGTS deposit', () => {
    const mod = new FGTSDiferencasModule();
    const inputs: ResolvedInputs = {
      base: 5000,
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 8,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(400); // 5000 * 8% = 400
  });

  it('calculates 40% multa FGTS', () => {
    const mod = new Multa40FGTSModule();
    const inputs: ResolvedInputs = {
      base: 400, // total FGTS deposits
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 40,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(160); // 400 * 40% = 160
  });

  it('FGTS module has indenizatoria nature', () => {
    const mod = new FGTSDiferencasModule();
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });
});

describe('VerbaModule - Registry', () => {
  it('all expected modules are registered', () => {
    const all = getAllVerbaModules();
    const ids = all.map(m => m.id);

    expect(ids).toContain('HE_50');
    expect(ids).toContain('HE_100');
    expect(ids).toContain('DSR');
    expect(ids).toContain('MULTA_467');
    expect(ids).toContain('MULTA_477');
    expect(ids).toContain('FGTS_DIF');
    expect(ids).toContain('MULTA_40_FGTS');
  });

  it('topological sort respects dependencies', () => {
    const ordered = getModulesInOrder();
    const ids = ordered.map(m => m.id);

    // DSR depends on HE_50 and HE_100
    const dsrIdx = ids.indexOf('DSR');
    const he50Idx = ids.indexOf('HE_50');
    const he100Idx = ids.indexOf('HE_100');

    if (dsrIdx >= 0 && he50Idx >= 0) {
      expect(he50Idx).toBeLessThan(dsrIdx);
    }
    if (dsrIdx >= 0 && he100Idx >= 0) {
      expect(he100Idx).toBeLessThan(dsrIdx);
    }

    // MULTA_40_FGTS depends on FGTS_DIF
    const multa40Idx = ids.indexOf('MULTA_40_FGTS');
    const fgtsDifIdx = ids.indexOf('FGTS_DIF');
    if (multa40Idx >= 0 && fgtsDifIdx >= 0) {
      expect(fgtsDifIdx).toBeLessThan(multa40Idx);
    }
  });
});
