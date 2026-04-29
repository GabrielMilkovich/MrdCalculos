/**
 * =====================================================
 * MODULO ESTABILIDADE — testes do calculo real (engine v3)
 * =====================================================
 * Cobre:
 *   - tipos GESTANTE, CIPA, ACIDENTE_TRABALHO, OUTRO
 *   - calculo da data fim a partir da data do evento
 *   - calculo de meses entre datas
 *   - fator consolidado (~1.476) e indenizacao final
 *   - registro do modulo no registry
 *
 * NAO duplica os testes basicos ja presentes em
 * `verba-modules-extended.test.ts` (modulo do registry e formula).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

// Trigger registration
import '../verba-modules';
import {
  ESTABILIDADE_TIPOS,
  FATOR_INDENIZACAO_CONSOLIDADA,
  calcularDataFim,
  mesesEntreDatas,
  calcularIndenizacaoConsolidada,
  EstabilidadeModule,
} from '../verba-modules/estabilidade';
import { getVerbaModule } from '../verba-modules/types';

describe('Estabilidade — tipos canonicos', () => {
  it('expoe os 4 tipos exigidos pela legislacao', () => {
    const tipos = Object.keys(ESTABILIDADE_TIPOS).sort();
    expect(tipos).toEqual(['ACIDENTE_TRABALHO', 'CIPA', 'GESTANTE', 'OUTRO']);
  });

  it('GESTANTE: 5 meses (Art. 10, II, b, ADCT + Sumula 244 TST)', () => {
    expect(ESTABILIDADE_TIPOS.GESTANTE.mesesPadrao).toBe(5);
    expect(ESTABILIDADE_TIPOS.GESTANTE.fundamento).toContain('ADCT');
    expect(ESTABILIDADE_TIPOS.GESTANTE.fundamento).toContain('244');
  });

  it('CIPA: 12 meses (Art. 10, II, a, ADCT)', () => {
    expect(ESTABILIDADE_TIPOS.CIPA.mesesPadrao).toBe(12);
    expect(ESTABILIDADE_TIPOS.CIPA.fundamento).toContain('ADCT');
  });

  it('ACIDENTE_TRABALHO: 12 meses (Art. 118, Lei 8.213/91)', () => {
    expect(ESTABILIDADE_TIPOS.ACIDENTE_TRABALHO.mesesPadrao).toBe(12);
    expect(ESTABILIDADE_TIPOS.ACIDENTE_TRABALHO.fundamento).toContain('118');
    expect(ESTABILIDADE_TIPOS.ACIDENTE_TRABALHO.fundamento).toContain('8.213');
  });

  it('OUTRO: variavel (norma coletiva / decisao judicial)', () => {
    expect(ESTABILIDADE_TIPOS.OUTRO.mesesPadrao).toBe(0);
  });
});

describe('Estabilidade — calcular data fim', () => {
  it('GESTANTE: parto em 2024-06-15 → fim em 2024-11-15 (5 meses)', () => {
    expect(calcularDataFim('GESTANTE', '2024-06-15')).toBe('2024-11-15');
  });

  it('CIPA: fim de mandato em 2024-01-31 → fim estabilidade em 2025-01-31', () => {
    expect(calcularDataFim('CIPA', '2024-01-31')).toBe('2025-01-31');
  });

  it('ACIDENTE_TRABALHO: alta em 2023-03-10 → fim em 2024-03-10 (12 meses)', () => {
    expect(calcularDataFim('ACIDENTE_TRABALHO', '2023-03-10')).toBe('2024-03-10');
  });

  it('OUTRO: usa override de meses', () => {
    expect(calcularDataFim('OUTRO', '2024-01-01', 24)).toBe('2026-01-01');
  });

  it('OUTRO sem override: retorna a propria data (meses=0)', () => {
    expect(calcularDataFim('OUTRO', '2024-01-01')).toBe('2024-01-01');
  });

  it('data invalida: retorna a propria string', () => {
    expect(calcularDataFim('GESTANTE', 'invalida')).toBe('invalida');
  });
});

describe('Estabilidade — meses entre datas', () => {
  it('5 meses cheios', () => {
    const m = mesesEntreDatas('2024-01-01', '2024-06-01');
    expect(m.toDP(4).toNumber()).toBe(5);
  });

  it('12 meses cheios (1 ano)', () => {
    const m = mesesEntreDatas('2023-01-01', '2024-01-01');
    expect(m.toDP(4).toNumber()).toBe(12);
  });

  it('5 meses + 15 dias = 5.5 (15/30)', () => {
    const m = mesesEntreDatas('2024-01-01', '2024-06-16');
    expect(m.toDP(4).toNumber()).toBe(5.5);
  });

  it('fim antes de inicio: zero', () => {
    const m = mesesEntreDatas('2024-06-01', '2024-01-01');
    expect(m.toNumber()).toBe(0);
  });

  it('datas invalidas: zero', () => {
    expect(mesesEntreDatas('xxx', '2024-01-01').toNumber()).toBe(0);
    expect(mesesEntreDatas('2024-01-01', 'yyy').toNumber()).toBe(0);
  });
});

describe('Estabilidade — fator de indenizacao consolidada', () => {
  it('e maior que 1 (salario base + reflexos)', () => {
    expect(FATOR_INDENIZACAO_CONSOLIDADA.greaterThan(1)).toBe(true);
  });

  it('inclui reflexos previstos: 13o + ferias + 1/3 + FGTS + multa 40%', () => {
    // base = 1 + 1/12 + 1/12 + 1/36 = 1.19444...
    // fgts = 0.08 * base = 0.09556...
    // multa 40% = 0.40 * fgts
    // total = base + fgts*(1+0.4) ≈ 1.32825
    const expected = new Decimal(1)
      .plus(new Decimal(1).div(12))
      .plus(new Decimal(1).div(12))
      .plus(new Decimal(1).div(3).div(12))
      .times(new Decimal(1).plus(new Decimal(0.08).times(1.4)));
    expect(FATOR_INDENIZACAO_CONSOLIDADA.toDP(4).toNumber()).toBe(expected.toDP(4).toNumber());
  });

  it('aproxima 1.328 (acordo com fundamento legal padrao)', () => {
    // E exato: 1.19444 * 1.112 = 1.32822
    const v = FATOR_INDENIZACAO_CONSOLIDADA.toDP(3).toNumber();
    expect(v).toBeGreaterThan(1.32);
    expect(v).toBeLessThan(1.34);
  });
});

describe('Estabilidade — calcular indenizacao consolidada', () => {
  it('GESTANTE: salario 3000 x 5 meses', () => {
    const ind = calcularIndenizacaoConsolidada(3000, 5);
    // 3000 * 5 * fator
    const esperado = new Decimal(3000).times(5).times(FATOR_INDENIZACAO_CONSOLIDADA).toDP(2);
    expect(ind.toNumber()).toBe(esperado.toNumber());
  });

  it('CIPA: salario 2500 x 12 meses', () => {
    const ind = calcularIndenizacaoConsolidada(2500, 12);
    expect(ind.greaterThan(2500 * 12)).toBe(true); // > soma simples
  });

  it('ACIDENTE_TRABALHO: salario 4000 x 12 meses', () => {
    const ind = calcularIndenizacaoConsolidada(4000, 12);
    const base = 4000 * 12;
    expect(ind.toNumber()).toBeGreaterThan(base);
  });

  it('zero ou negativo: retorna 0', () => {
    expect(calcularIndenizacaoConsolidada(0, 5).toNumber()).toBe(0);
    expect(calcularIndenizacaoConsolidada(3000, 0).toNumber()).toBe(0);
    expect(calcularIndenizacaoConsolidada(-100, 5).toNumber()).toBe(0);
    expect(calcularIndenizacaoConsolidada(3000, -1).toNumber()).toBe(0);
  });

  it('preserva centavos (Decimal.js)', () => {
    const ind = calcularIndenizacaoConsolidada(1234.56, 5);
    // Resultado deve ter no maximo 2 casas
    const decimals = ind.toFixed().split('.')[1];
    if (decimals) {
      expect(decimals.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('Estabilidade — modulo registrado no engine v3', () => {
  it('registrado com id ESTABILIDADE', () => {
    const mod = getVerbaModule('ESTABILIDADE');
    expect(mod).toBeDefined();
    expect(mod?.id).toBe('ESTABILIDADE');
  });

  it('familia contratual', () => {
    const mod = new EstabilidadeModule();
    expect(mod.familia).toBe('contratual');
  });

  it('reflexos: 13o, ferias, FGTS', () => {
    const mod = new EstabilidadeModule();
    const reflections = mod.getReflections();
    expect(reflections.length).toBe(3);
    const tipos = reflections.map(r => r.tipo);
    expect(tipos).toContain('13_salario');
    expect(tipos).toContain('ferias');
    expect(tipos).toContain('fgts');
  });

  it('natureza salarial com FGTS/INSS/IRRF', () => {
    const mod = new EstabilidadeModule();
    const inc = mod.getIncidences();
    expect(inc.natureza).toBe('salarial');
    expect(inc.fgts).toBe(true);
    expect(inc.inss).toBe(true);
    expect(inc.irrf).toBe(true);
  });
});
