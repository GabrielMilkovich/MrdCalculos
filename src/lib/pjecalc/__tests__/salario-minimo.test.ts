import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { getSalarioMinimoVigente, getSalarioMinimoPorPeriodo } from '../salario-minimo';

describe('getSalarioMinimoVigente', () => {
  it('2025-01 → R$ 1518', () => {
    expect(getSalarioMinimoVigente('2025-01').toNumber()).toBe(1518);
  });

  it('2026-01 (futuro, sem entrada) → último vigente = R$ 1518', () => {
    expect(getSalarioMinimoVigente('2026-01').toNumber()).toBe(1518);
  });

  it('2024-06 → R$ 1412', () => {
    expect(getSalarioMinimoVigente('2024-06').toNumber()).toBe(1412);
  });

  it('2023-01 → R$ 1320', () => {
    expect(getSalarioMinimoVigente('2023-01').toNumber()).toBe(1320);
  });

  it('2022-01 → R$ 1212', () => {
    expect(getSalarioMinimoVigente('2022-01').toNumber()).toBe(1212);
  });

  it('aceita formato YYYY-MM-DD', () => {
    expect(getSalarioMinimoVigente('2025-01-15').toNumber()).toBe(1518);
  });

  it('competência antes de todos os registros → retorna o mais antigo', () => {
    expect(getSalarioMinimoVigente('2005-01').toNumber()).toBe(465);
  });
});

describe('getSalarioMinimoPorPeriodo', () => {
  it('2024-01 a 2024-06 → 6 entradas com R$ 1412', () => {
    const resultado = getSalarioMinimoPorPeriodo('2024-01-01', '2024-06-30');
    expect(resultado).toHaveLength(6);
    for (const { valor } of resultado) {
      expect(valor.toNumber()).toBe(1412);
    }
  });

  it('período cruzando virada de SM (Dez 2024 + Jan 2025)', () => {
    const resultado = getSalarioMinimoPorPeriodo('2024-12-01', '2025-01-31');
    expect(resultado).toHaveLength(2);
    expect(resultado[0].competencia).toBe('2024-12');
    expect(resultado[0].valor.toNumber()).toBe(1412);
    expect(resultado[1].competencia).toBe('2025-01');
    expect(resultado[1].valor.toNumber()).toBe(1518);
  });

  it('mês único', () => {
    const resultado = getSalarioMinimoPorPeriodo('2025-01-01', '2025-01-31');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].valor.toNumber()).toBe(1518);
  });

  it('12 meses de 2024', () => {
    const resultado = getSalarioMinimoPorPeriodo('2024-01-01', '2024-12-31');
    expect(resultado).toHaveLength(12);
    for (const { valor } of resultado) {
      expect(valor.toNumber()).toBe(1412);
    }
  });
});
