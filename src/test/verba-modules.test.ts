/**
 * =====================================================
 * VERBA MODULES INTEGRATION TESTS
 * =====================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Decimal from 'decimal.js';
import { getAllVerbaModules, getModulesInOrder, getVerbaModule } from '@/lib/pjecalc/verba-modules';
import type { VerbaModuleContext } from '@/lib/pjecalc/verba-modules/types';
import type { PjeVerba } from '@/lib/pjecalc/engine-types';

// ── Helper: minimal context ──
function makeCtx(overrides: Partial<VerbaModuleContext> = {}): VerbaModuleContext {
  return {
    caseId: 'test-case',
    competencia: '2024-06',
    periodo: { inicio: '2024-01-01', fim: '2024-12-31' },
    admissao: '2020-01-06',
    demissao: '2024-06-15',
    historicos: [{
      id: 'h1', nome: 'Salário Base',
      periodo_inicio: '2020-01-06', periodo_fim: '2024-06-15',
      tipo_valor: 'informado', valor_informado: 3000,
      incidencia_fgts: true, incidencia_cs: true,
      fgts_recolhido: false, cs_recolhida: false,
      ocorrencias: [],
    }],
    cartaoPonto: [],
    faltas: [],
    ferias: [],
    calendario: { diasUteis: 22, repousos: 4, feriados: 1, diasNoMes: 30 },
    cargaHoraria: 220,
    sabadoDiaUtil: false,
    zerarNegativo: true,
    resultadosAnteriores: new Map(),
    ...overrides,
  };
}

function makeVerba(overrides: Partial<PjeVerba> = {}): PjeVerba {
  return {
    id: 'v1',
    nome: 'Test Verba',
    codigo: 'TEST',
    caracteristica: 'COMUM',
    multiplicador: 1,
    divisor_informado: 1,
    ativa: true,
    ordem: 0,
    ...overrides,
  } as PjeVerba;
}

describe('Verba Module Registry', () => {
  beforeAll(() => {
    // Imports trigger registration
  });

  it('should have all expected modules registered', () => {
    const modules = getAllVerbaModules();
    const ids = modules.map(m => m.id);
    
    expect(ids).toContain('HE_50');
    expect(ids).toContain('HE_100');
    expect(ids).toContain('DSR');
    expect(ids).toContain('SALDO_SAL');
    expect(ids).toContain('AVISO_PREVIO');
    expect(ids).toContain('DECIMO_PROP');
    expect(ids).toContain('FERIAS_VENC');
    expect(ids).toContain('FERIAS_PROP');
    expect(ids).toContain('FGTS_DIF');
    expect(ids).toContain('MULTA_40_FGTS');
    expect(ids).toContain('PLR_PROP');
    expect(ids).toContain('SAL_SUBST');
    expect(ids).toContain('COMISSAO');
    expect(ids).toContain('INTRAJORNADA');
    expect(ids).toContain('DOM_FER');
    expect(ids).toContain('MULTA_467');
    expect(ids).toContain('MULTA_477');
  });

  it('should return modules in topological order', () => {
    const ordered = getModulesInOrder();
    const ids = ordered.map(m => m.id);
    
    // FGTS_DIF depends on HE_50, DSR, etc. → must come after
    const fgtsIdx = ids.indexOf('FGTS_DIF');
    const heIdx = ids.indexOf('HE_50');
    if (fgtsIdx >= 0 && heIdx >= 0) {
      expect(fgtsIdx).toBeGreaterThan(heIdx);
    }
    
    // MULTA_40 depends on FGTS_DIF
    const multaIdx = ids.indexOf('MULTA_40_FGTS');
    if (multaIdx >= 0 && fgtsIdx >= 0) {
      expect(multaIdx).toBeGreaterThan(fgtsIdx);
    }
  });
});

describe('Saldo de Salário Module', () => {
  it('should calculate correctly for day 15 dismissal', () => {
    const mod = getVerbaModule('SALDO_SAL')!;
    const ctx = makeCtx({ demissao: '2024-06-15' });
    const verba = makeVerba();
    
    expect(mod.canApply(ctx, verba)).toBe(true);
    
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(3000);
    expect(inputs.quantidade).toBe(15); // dia 15
    expect(inputs.divisor).toBe(30);
    
    const result = mod.applyFormula(inputs, verba);
    // 3000/30 × 15 = 1500
    expect(result).toBe(1500);
  });

  it('should cap at 30 days per Art. 64 CLT', () => {
    const mod = getVerbaModule('SALDO_SAL')!;
    const ctx = makeCtx({ demissao: '2024-07-31' });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.quantidade).toBe(30); // capped at 30 even though July has 31
  });
});

describe('Aviso Prévio Module', () => {
  it('should calculate with Lei 12.506/2011 (30 + 3×anos)', () => {
    const mod = getVerbaModule('AVISO_PREVIO')!;
    const ctx = makeCtx({ admissao: '2020-01-06', demissao: '2024-06-15' });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    // 4 years → 30 + 4*3 = 42 days
    expect(inputs.quantidade).toBe(42);
    
    const result = mod.applyFormula(inputs, verba);
    // 3000/30 × 42 = 4200
    expect(result).toBe(4200);
  });

  it('should be indenizatória for INSS/IRRF but incide FGTS', () => {
    const mod = getVerbaModule('AVISO_PREVIO')!;
    const verba = makeVerba();
    const inc = mod.getIncidences(verba);
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(false);
    expect(inc.irrf).toBe(false);
    expect(inc.natureza).toBe('indenizatoria');
  });
});

describe('13º Salário Proporcional Module', () => {
  it('should calculate avos correctly', () => {
    const mod = getVerbaModule('DECIMO_PROP')!;
    const ctx = makeCtx({ admissao: '2024-01-02', demissao: '2024-06-15' });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    // Jan-Jun 2024, all months with 15+ days → 6 avos (depends on exact calculation)
    expect(inputs.quantidade).toBeGreaterThanOrEqual(5);
    expect(inputs.quantidade).toBeLessThanOrEqual(6);
    expect(inputs.divisor).toBe(12);
  });
});

describe('Férias Vencidas Module', () => {
  it('should apply 1/3 constitucional', () => {
    const mod = getVerbaModule('FERIAS_VENC')!;
    const ctx = makeCtx();
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    // 4/3 = 1.3333
    expect(inputs.multiplicador).toBeCloseTo(1.3333, 3);
  });

  it('should reduce days per Art. 130 CLT with many absences', () => {
    const mod = getVerbaModule('FERIAS_VENC')!;
    const faltas = Array.from({ length: 10 }, (_, i) => ({
      id: `f${i}`, data_inicial: `2024-0${(i % 9) + 1}-01`, data_final: `2024-0${(i % 9) + 1}-01`,
      justificada: false, tipo_falta: 'FALTA', motivo: '',
    }));
    const ctx = makeCtx({ faltas });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.quantidade).toBe(24); // 6-14 faltas → 24 dias
  });
});

describe('FGTS sobre Diferenças Module', () => {
  it('should sum differences from previous modules', () => {
    const mod = getVerbaModule('FGTS_DIF')!;
    const anteriores = new Map<string, any[]>();
    anteriores.set('HE_50', [
      { competencia: '2024-06', diferenca: 500, base: 500, divisor: 1, multiplicador: 1, quantidade: 1, dobra: 1, devido: 500, pago: 0, indice_correcao: 0, valor_corrigido: 500, juros: 0, valor_final: 500, formula: '' },
    ]);
    
    const ctx = makeCtx({ resultadosAnteriores: anteriores });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    expect(inputs.base).toBe(500);
    expect(inputs.multiplicador).toBe(8);
    
    const result = mod.applyFormula(inputs, verba);
    expect(result).toBe(40); // 500 × 8% = 40
  });
});

describe('Decimal Precision', () => {
  it('should produce consistent results with Decimal.js', () => {
    const mod = getVerbaModule('SALDO_SAL')!;
    const ctx = makeCtx({
      demissao: '2024-06-17',
      historicos: [{
        id: 'h1', nome: 'Salário',
        periodo_inicio: '2020-01-06', periodo_fim: '2024-06-17',
        tipo_valor: 'informado', valor_informado: 4567.89,
        incidencia_fgts: true, incidencia_cs: true,
        fgts_recolhido: false, cs_recolhida: false,
        ocorrencias: [],
      }],
    });
    const verba = makeVerba();
    
    const inputs = mod.resolveInputs(ctx, verba);
    const result = mod.applyFormula(inputs, verba);
    
    // 4567.89/30 = 152.263 → truncated to 152.26
    // 152.26 × 17 = 2588.42
    const expected = new Decimal(4567.89).div(30).toDP(2).times(17).toDP(2).toNumber();
    expect(result).toBe(expected);
  });
});
