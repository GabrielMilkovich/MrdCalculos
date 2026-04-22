/**
 * CustasJudiciais.calcularValorTetoCustasConhecimento — golden (Fase 6)
 *
 * Fidelidade 1-a-1 com CustasJudiciais.java:262-272.
 * Teto = teto previdenciário (INSS) na competência × 4 (CLT 789 §1º).
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { CustasJudiciais } from '../custas-judiciais';

describe('CustasJudiciais.calcularValorTetoCustasConhecimento', () => {
  it('sem finder: retorna null (compatibilidade com stub anterior)', () => {
    const r = CustasJudiciais.calcularValorTetoCustasConhecimento(new Date('2023-06-15'));
    expect(r).toBeNull();
  });

  it('finder devolve teto: multiplica por 4', () => {
    const finder = (_: Date) => new Decimal('7507.49'); // teto INSS 2023
    const r = CustasJudiciais.calcularValorTetoCustasConhecimento(new Date('2023-06-15'), finder);
    // 7507.49 × 4 = 30029.96
    expect(r?.toString()).toBe('30029.96');
  });

  it('finder devolve null: retorna null', () => {
    const finder = (_: Date) => null;
    const r = CustasJudiciais.calcularValorTetoCustasConhecimento(new Date('2023-06-15'), finder);
    expect(r).toBeNull();
  });

  it('competência é normalizada para dia 1 antes de consultar finder', () => {
    let competenciaUsada: Date | null = null;
    const finder = (c: Date) => {
      competenciaUsada = c;
      return new Decimal('1000');
    };
    CustasJudiciais.calcularValorTetoCustasConhecimento(new Date('2023-06-15'), finder);
    expect(competenciaUsada!.getDate()).toBe(1);
    expect(competenciaUsada!.getMonth()).toBe(5); // Junho
    expect(competenciaUsada!.getFullYear()).toBe(2023);
  });
});
