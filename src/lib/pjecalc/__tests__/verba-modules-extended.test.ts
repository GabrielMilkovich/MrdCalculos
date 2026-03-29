import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Import modules to trigger registration
import '../verba-modules';

import type { VerbaModuleContext, ResolvedInputs } from '../verba-modules/types';
import type { PjeVerba } from '../engine-types';
import { AdicionalNoturnoModule } from '../verba-modules/adicional-noturno';
import { InsalubridadeModule } from '../verba-modules/insalubridade';
import { PericulosidadeModule } from '../verba-modules/periculosidade';
import { AvisoPrevioModule } from '../verba-modules/aviso-previo';
import { Multa467Module, Multa477Module } from '../verba-modules/multas-clt';
import { FGTSDiferencasModule, Multa40FGTSModule } from '../verba-modules/fgts-rescisorio';
import { DanosMoraisModule } from '../verba-modules/danos-morais';
import { EstabilidadeModule } from '../verba-modules/estabilidade';
import { PLRProporcionalModule } from '../verba-modules/plr';
import { getVerbaModule } from '../verba-modules/types';
import { makeVerba } from './helpers';

// ── Shared context factory ──

function makeContext(overrides: Partial<VerbaModuleContext> = {}): VerbaModuleContext {
  return {
    caseId: 'test-ext-001',
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
      valor_informado: 3500,
      incidencia_fgts: true,
      incidencia_cs: true,
      fgts_recolhido: false,
      cs_recolhida: false,
      ocorrencias: [
        { id: 'oc1', historico_id: 'hist-001', competencia: '2023-06', valor: 3500, tipo: 'informado' },
      ],
    }],
    cartaoPonto: [{
      competencia: '2023-06',
      dias_uteis: 22,
      dias_trabalhados: 22,
      horas_extras_50: 0,
      horas_extras_100: 0,
      horas_noturnas: 40,
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

// =====================================================
// 1. ADICIONAL NOTURNO
// =====================================================

describe('VerbaModule - Adicional Noturno', () => {
  const mod = new AdicionalNoturnoModule();

  it('is registered with id ADIC_NOTURNO', () => {
    expect(getVerbaModule('ADIC_NOTURNO')).toBeDefined();
  });

  it('applies 20% adicional over base salary', () => {
    const inputs: ResolvedInputs = {
      base: 3500,
      baseSource: 'test',
      quantidade: 40,
      quantidadeSource: 'cartao_ponto',
      divisor: 220,
      divisorSource: 'carga_horaria',
      multiplicador: 0.20,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    // 3500/220 = 15.90, * 0.20 = 3.18, * 40 = 127.20
    expect(result).toBe(127.20);
  });

  it('applies hora reduzida factor 8/7 when hora_noturna_ficticia is set', () => {
    const ctx = makeContext();
    const verba = makeVerba({
      tipo_quantidade: 'cartao_ponto',
      quantidade_cartao_colunas: ['horas_noturnas'],
      tipo_divisor: 'carga_horaria',
      multiplicador: 0.20,
      hora_noturna_ficticia: true,
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });

    const inputs = mod.resolveInputs(ctx, verba);
    // Divisor = 220 * 7/8 = 192.5
    const expectedDivisor = new Decimal(220).times(7).div(8).toDP(4).toNumber();
    expect(inputs.divisor).toBe(expectedDivisor);
    expect(inputs.quantidade).toBe(40);
    expect(inputs.multiplicador).toBe(0.20);
  });

  it('declares reflexos: DSR, 13o, Ferias, FGTS', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(4);
    const tipos = reflections.map(r => r.tipo);
    expect(tipos).toContain('dsr');
    expect(tipos).toContain('13_salario');
    expect(tipos).toContain('ferias');
    expect(tipos).toContain('fgts');
  });

  it('has salarial nature with FGTS/INSS/IRRF incidences', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });

  it('returns 0 when quantidade is 0 (no horas noturnas)', () => {
    const inputs: ResolvedInputs = {
      base: 3500,
      baseSource: 'test',
      quantidade: 0,
      quantidadeSource: 'cartao_ponto',
      divisor: 220,
      divisorSource: 'test',
      multiplicador: 0.20,
    };
    expect(mod.applyFormula(inputs, makeVerba())).toBe(0);
  });
});

// =====================================================
// 2. INSALUBRIDADE
// =====================================================

describe('VerbaModule - Insalubridade', () => {
  const mod = new InsalubridadeModule();

  it('is registered with id INSALUBRIDADE', () => {
    expect(getVerbaModule('INSALUBRIDADE')).toBeDefined();
  });

  it('calculates grau minimo: 10% over salario minimo', () => {
    const inputs: ResolvedInputs = {
      base: 1412, // salario minimo 2024
      baseSource: 'tabela:salario_minimo',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 0.10,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(141.20);
  });

  it('calculates grau medio: 20% over salario minimo', () => {
    const inputs: ResolvedInputs = {
      base: 1412,
      baseSource: 'tabela:salario_minimo',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 0.20,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(282.40);
  });

  it('calculates grau maximo: 40% over salario minimo', () => {
    const inputs: ResolvedInputs = {
      base: 1412,
      baseSource: 'tabela:salario_minimo',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 0.40,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(564.80);
  });

  it('resolves grau metadata correctly', () => {
    const ctx = makeContext();
    const verba = makeVerba({
      multiplicador: 0.40,
      constante_mensal: 1412,
      base_calculo: { historicos: [], verbas: [], tabelas: ['salario_minimo'], proporcionalizar: false, integralizar: false },
    });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.metadata?.grau).toBe('maximo');
    expect(inputs.metadata?.usa_salario_minimo).toBe(true);
  });

  it('declares reflexos: 13o, Ferias, FGTS (no DSR)', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(3);
    const tipos = reflections.map(r => r.tipo);
    expect(tipos).toContain('13_salario');
    expect(tipos).toContain('ferias');
    expect(tipos).toContain('fgts');
    expect(tipos).not.toContain('dsr');
  });

  it('has salarial nature with full incidences', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });
});

// =====================================================
// 3. PERICULOSIDADE
// =====================================================

describe('VerbaModule - Periculosidade', () => {
  const mod = new PericulosidadeModule();

  it('is registered with id PERICULOSIDADE', () => {
    expect(getVerbaModule('PERICULOSIDADE')).toBeDefined();
  });

  it('calculates 30% over base salary', () => {
    const inputs: ResolvedInputs = {
      base: 3500,
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 0.30,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(1050);
  });

  it('resolves base from salary history', () => {
    const ctx = makeContext();
    const verba = makeVerba({
      multiplicador: 0.30,
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(3500);
    expect(inputs.multiplicador).toBe(0.30);
  });

  it('declares reflexos: 13o, Ferias, FGTS', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(3);
    const tipos = reflections.map(r => r.tipo);
    expect(tipos).toContain('13_salario');
    expect(tipos).toContain('ferias');
    expect(tipos).toContain('fgts');
  });

  it('has salarial nature', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.natureza).toBe('salarial');
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
  });

  it('returns 0 when base is 0', () => {
    const inputs: ResolvedInputs = {
      base: 0,
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 0.30,
    };
    expect(mod.applyFormula(inputs, makeVerba())).toBe(0);
  });
});

// =====================================================
// 4. AVISO PREVIO
// =====================================================

describe('VerbaModule - Aviso Previo', () => {
  const mod = new AvisoPrevioModule();

  it('is registered with id AVISO_PREVIO_PROPORCIONAL', () => {
    expect(getVerbaModule('AVISO_PREVIO_PROPORCIONAL')).toBeDefined();
  });

  it('calculates proportional days: 30d + 3d/year (3 years = 39d)', () => {
    const ctx = makeContext({
      admissao: '2020-01-01',
      demissao: '2023-06-30',
    });
    const verba = makeVerba({
      ocorrencia_pagamento: 'desligamento',
      tipo_quantidade: 'apurada',
      divisor_informado: 30,
      multiplicador: 1,
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });

    const inputs = mod.resolveInputs(ctx, verba);
    // 3 full years => 30 + 3*3 = 39 days
    expect(inputs.quantidade).toBe(39);
  });

  it('caps at 90 days maximum (20+ years)', () => {
    const ctx = makeContext({
      admissao: '2000-01-01',
      demissao: '2023-12-31',
    });
    const verba = makeVerba({
      ocorrencia_pagamento: 'desligamento',
      tipo_quantidade: 'apurada',
      divisor_informado: 30,
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });

    const inputs = mod.resolveInputs(ctx, verba);
    // 23 years => 30 + 23*3 = 99, capped at 90
    expect(inputs.quantidade).toBe(90);
  });

  it('calculates value correctly: (salary/30) * dias', () => {
    const inputs: ResolvedInputs = {
      base: 3500,
      baseSource: 'test',
      quantidade: 39,
      quantidadeSource: 'proporcional',
      divisor: 30,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    // 3500 / 30 = 116.66, * 39 = 4549.74
    const expected = new Decimal(3500).div(30).toDP(2).times(39).toDP(2).toNumber();
    expect(result).toBe(expected);
  });

  it('aviso previo indenizado: FGTS yes, INSS/IRRF no', () => {
    const verba = makeVerba({ caracteristica: 'aviso_previo' });
    const inc = mod.getIncidences(verba);
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });

  it('aviso previo trabalhado: full incidences', () => {
    const verba = makeVerba({ caracteristica: 'comum' });
    const inc = mod.getIncidences(verba);
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });

  it('only applies at desligamento', () => {
    const ctx = makeContext();
    const verba = makeVerba({ ocorrencia_pagamento: 'mensal' });
    expect(mod.canApply(ctx, verba)).toBe(false);

    const verbaDesl = makeVerba({ ocorrencia_pagamento: 'desligamento' });
    expect(mod.canApply(ctx, verbaDesl)).toBe(true);
  });

  it('declares FGTS reflection', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(1);
    expect(reflections[0].tipo).toBe('fgts');
  });
});

// =====================================================
// 5. MULTA CLT ART. 467
// =====================================================

describe('VerbaModule - Multa Art. 467 CLT', () => {
  const mod = new Multa467Module();

  it('is registered with id MULTA_467', () => {
    expect(getVerbaModule('MULTA_467')).toBeDefined();
  });

  it('calculates 50% penalty over incontroverso value', () => {
    const verba = makeVerba({ valor_informado_devido: 8000 });
    const inputs = mod.resolveInputs(makeContext(), verba);
    expect(inputs.base).toBe(8000);
    expect(inputs.multiplicador).toBe(0.5);

    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(4000);
  });

  it('returns 0 when no incontroverso value', () => {
    const verba = makeVerba({ valor_informado_devido: 0 });
    const inputs = mod.resolveInputs(makeContext(), verba);
    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(0);
  });

  it('has indenizatoria nature (no FGTS, INSS, IRRF)', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });

  it('generates no reflexos', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(0);
  });
});

// =====================================================
// 6. MULTA CLT ART. 477
// =====================================================

describe('VerbaModule - Multa Art. 477 CLT', () => {
  const mod = new Multa477Module();

  it('is registered with id MULTA_477', () => {
    expect(getVerbaModule('MULTA_477')).toBeDefined();
  });

  it('calculates one salary as penalty', () => {
    const ctx = makeContext();
    const verba = makeVerba({ valor_informado_devido: 3500 });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.multiplicador).toBe(1);
    expect(inputs.base).toBe(3500);

    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(3500);
  });

  it('falls back to ultima remuneracao from historico when no valor_informado', () => {
    const ctx = makeContext();
    const verba = makeVerba({ valor_informado_devido: undefined });
    const inputs = mod.resolveInputs(ctx, verba);
    // Should pick up 3500 from the historico ocorrencia
    expect(inputs.base).toBe(3500);
  });

  it('has indenizatoria nature', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.natureza).toBe('indenizatoria');
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
  });

  it('generates no reflexos', () => {
    expect(mod.getReflections(makeVerba()).length).toBe(0);
  });
});

// =====================================================
// 7. FGTS RESCISORIO
// =====================================================

describe('VerbaModule - FGTS Rescisorio', () => {
  it('calculates 8% FGTS deposit on differences', () => {
    const mod = new FGTSDiferencasModule();
    const inputs: ResolvedInputs = {
      base: 7500,
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 8,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(600); // 7500 * 8% = 600
  });

  it('calculates 40% multa FGTS on total deposits', () => {
    const mod = new Multa40FGTSModule();
    const inputs: ResolvedInputs = {
      base: 600, // total FGTS deposits
      baseSource: 'soma_fgts_diferencas',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 40,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(240); // 600 * 40% = 240
  });

  it('Multa 40% applies 20% for culpa reciproca', () => {
    const mod = new Multa40FGTSModule();
    const inputs: ResolvedInputs = {
      base: 600,
      baseSource: 'soma_fgts_diferencas',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 20, // culpa reciproca = 20% instead of 40%
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(120); // 600 * 20% = 120
  });

  it('FGTS diferencas has indenizatoria nature', () => {
    const mod = new FGTSDiferencasModule();
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });

  it('Multa 40% has indenizatoria nature', () => {
    const mod = new Multa40FGTSModule();
    const inc = mod.getIncidences(makeVerba());
    expect(inc.natureza).toBe('indenizatoria');
  });

  it('FGTS generates no reflexos', () => {
    const mod = new FGTSDiferencasModule();
    expect(mod.getReflections(makeVerba()).length).toBe(0);
  });

  it('Multa 40% depends on FGTS_DIF', () => {
    const mod = new Multa40FGTSModule();
    expect(mod.dependencias).toContain('FGTS_DIF');
  });

  it('Multa 40% canApply only when there is demissao', () => {
    const mod = new Multa40FGTSModule();
    const ctxWithDemissao = makeContext({ demissao: '2023-12-31' });
    expect(mod.canApply(ctxWithDemissao, makeVerba())).toBe(true);

    const ctxNoDemissao = makeContext({ demissao: undefined });
    expect(mod.canApply(ctxNoDemissao, makeVerba())).toBe(false);
  });

  it('resolves base from accumulated FGTS differences', () => {
    const mod = new Multa40FGTSModule();
    const fgtsResults = [
      {
        competencia: '2023-01', base: 3500, divisor: 1, multiplicador: 8, quantidade: 1,
        dobra: 1, devido: 280, pago: 0, diferenca: 280,
        indice_correcao: 1, valor_corrigido: 280, juros: 0, valor_final: 280, formula: 'test',
      },
      {
        competencia: '2023-02', base: 3500, divisor: 1, multiplicador: 8, quantidade: 1,
        dobra: 1, devido: 280, pago: 0, diferenca: 280,
        indice_correcao: 1, valor_corrigido: 280, juros: 0, valor_final: 280, formula: 'test',
      },
    ];
    const ctx = makeContext({
      resultadosAnteriores: new Map([['FGTS_DIF', fgtsResults]]),
    });
    const inputs = mod.resolveInputs(ctx, makeVerba());
    expect(inputs.base).toBe(560); // 280 + 280
    expect(inputs.multiplicador).toBe(40);
  });
});

// =====================================================
// 8. DANOS MORAIS
// =====================================================

describe('VerbaModule - Danos Morais', () => {
  const mod = new DanosMoraisModule();

  it('is registered with id DANOS_MORAIS', () => {
    expect(getVerbaModule('DANOS_MORAIS')).toBeDefined();
  });

  it('calculates fixed court-decided amount', () => {
    const verba = makeVerba({
      valor_informado_devido: 15000,
      multiplicador: 1,
      quantidade_informada: 1,
      divisor_informado: 1,
    });
    const inputs = mod.resolveInputs(makeContext(), verba);
    expect(inputs.base).toBe(15000);

    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(15000);
  });

  it('single occurrence (quantidade = 1)', () => {
    const verba = makeVerba({ valor_informado_devido: 20000, quantidade_informada: 1, divisor_informado: 1 });
    const inputs = mod.resolveInputs(makeContext(), verba);
    expect(inputs.quantidade).toBe(1);
  });

  it('generates NO reflexos (indenizatoria)', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(0);
  });

  it('has indenizatoria nature: no FGTS, no INSS, no IRRF', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });

  it('returns 0 when base is 0', () => {
    const inputs: ResolvedInputs = {
      base: 0,
      baseSource: 'test',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    expect(mod.applyFormula(inputs, makeVerba())).toBe(0);
  });

  it('audit trail references Art. 223-G CLT', () => {
    const ctx = makeContext();
    const inputs: ResolvedInputs = {
      base: 10000,
      baseSource: 'valor_informado_devido',
      quantidade: 1,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    const trail = mod.buildAuditTrail(ctx, inputs, 10000);
    const regras = trail.map(t => t.regra).filter(Boolean);
    expect(regras.some(r => r!.includes('223-G'))).toBe(true);
  });
});

// =====================================================
// 9. ESTABILIDADE PROVISORIA
// =====================================================

describe('VerbaModule - Estabilidade Provisoria', () => {
  const mod = new EstabilidadeModule();

  it('is registered with id ESTABILIDADE', () => {
    expect(getVerbaModule('ESTABILIDADE')).toBeDefined();
  });

  it('calculates salary x months for stability period', () => {
    // 5 months stability (gestante example)
    const inputs: ResolvedInputs = {
      base: 3500,
      baseSource: 'test',
      quantidade: 5,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(17500); // 3500 * 5
  });

  it('resolves base from salary history', () => {
    const ctx = makeContext();
    const verba = makeVerba({
      quantidade_informada: 12, // 12 months CIPA stability
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(3500);
    expect(inputs.quantidade).toBe(12);
  });

  it('declares reflexos: 13o, Ferias, FGTS', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(3);
    const tipos = reflections.map(r => r.tipo);
    expect(tipos).toContain('13_salario');
    expect(tipos).toContain('ferias');
    expect(tipos).toContain('fgts');
  });

  it('has salarial nature', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.natureza).toBe('salarial');
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
  });

  it('returns 0 when base is 0', () => {
    const inputs: ResolvedInputs = {
      base: 0,
      baseSource: 'test',
      quantidade: 5,
      quantidadeSource: 'informada',
      divisor: 1,
      divisorSource: 'informado',
      multiplicador: 1,
    };
    expect(mod.applyFormula(inputs, makeVerba())).toBe(0);
  });
});

// =====================================================
// 10. PLR
// =====================================================

describe('VerbaModule - PLR Proporcional', () => {
  const mod = new PLRProporcionalModule();

  it('is registered with id PLR_PROP', () => {
    expect(getVerbaModule('PLR_PROP')).toBeDefined();
  });

  it('calculates PLR proportional to months worked', () => {
    // Full year = 12 avos
    const inputs: ResolvedInputs = {
      base: 6000,
      baseSource: 'test',
      quantidade: 12,
      quantidadeSource: 'avos_ano',
      divisor: 12,
      divisorSource: 'lei_10101_2000',
      multiplicador: 1,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(6000); // 6000/12 * 12
  });

  it('calculates proportional PLR for partial year', () => {
    const inputs: ResolvedInputs = {
      base: 6000,
      baseSource: 'test',
      quantidade: 6,
      quantidadeSource: 'avos_ano',
      divisor: 12,
      divisorSource: 'lei_10101_2000',
      multiplicador: 1,
    };
    const result = mod.applyFormula(inputs, makeVerba());
    expect(result).toBe(3000); // 6000/12 * 6
  });

  it('generates NO reflexos (Art. 3 Lei 10.101/2000)', () => {
    const reflections = mod.getReflections(makeVerba());
    expect(reflections.length).toBe(0);
  });

  it('PLR: no FGTS, no INSS, yes IRRF (tributacao exclusiva)', () => {
    const inc = mod.getIncidences(makeVerba());
    expect(inc.fgts).toBe(false);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(true);
    expect(inc.natureza).toBe('salarial');
  });

  it('canApply checks verba name for PLR keyword', () => {
    const ctx = makeContext();
    const verbaPlr = makeVerba({ nome: 'PLR 2023' });
    expect(mod.canApply(ctx, verbaPlr)).toBe(true);

    const verbaOther = makeVerba({ nome: 'Horas Extras' });
    expect(mod.canApply(ctx, verbaOther)).toBe(false);
  });

  it('resolves avos counting months with 15+ days', () => {
    // Employee worked Jan-Jun 2023
    const ctx = makeContext({
      admissao: '2023-01-01',
      demissao: '2023-06-30',
      competencia: '2023-06',
    });
    const verba = makeVerba({
      nome: 'PLR 2023',
      valor_informado_devido: 12000,
      multiplicador: 12000,
    });
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.quantidade).toBe(6);
    expect(inputs.divisor).toBe(12);
  });
});
