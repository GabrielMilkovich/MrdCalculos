/**
 * Testa o parseFactAsDecimal — crítico para preservar centavos em
 * valores monetários brasileiros parseados de OCR.
 *
 * Garantias:
 *  - "1.234,56" pt-BR → 1234.56 (não perde cents)
 *  - "1,234.56" en-US → 1234.56
 *  - Decimal puro é retornado sem re-conversão
 *  - Entradas inválidas → Decimal(0) em vez de NaN
 *  - parseFactAsNumber delega para parseFactAsDecimal (sem regressão)
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  parseFactAsDecimal,
  parseFactAsNumber,
  type FactValue,
} from '../types';

function fact(valor: string | number | Decimal, tipo: FactValue['tipo'] = 'moeda'): FactValue {
  return { valor: valor as FactValue['valor'], tipo, confirmado: true };
}

describe('parseFactAsDecimal', () => {
  it('preserva centavos em formato pt-BR "1.234,56"', () => {
    const d = parseFactAsDecimal(fact('1.234,56'));
    expect(d.toString()).toBe('1234.56');
  });

  it('preserva centavos em formato en-US "1,234.56"', () => {
    const d = parseFactAsDecimal(fact('1,234.56'));
    expect(d.toString()).toBe('1234.56');
  });

  it('pt-BR com múltiplos separadores de milhar: "1.234.567,89"', () => {
    const d = parseFactAsDecimal(fact('1.234.567,89'));
    expect(d.toString()).toBe('1234567.89');
  });

  it('valor simples sem separador: "1234"', () => {
    const d = parseFactAsDecimal(fact('1234'));
    expect(d.toString()).toBe('1234');
  });

  it('valor decimal simples: "1234.56"', () => {
    const d = parseFactAsDecimal(fact('1234.56'));
    expect(d.toString()).toBe('1234.56');
  });

  it('com símbolo de moeda: "R$ 1.234,56"', () => {
    const d = parseFactAsDecimal(fact('R$ 1.234,56'));
    expect(d.toString()).toBe('1234.56');
  });

  it('número nativo é preservado', () => {
    const d = parseFactAsDecimal(fact(1234.56));
    expect(d.toString()).toBe('1234.56');
  });

  it('Decimal passa-through', () => {
    const input = new Decimal('1234.56');
    const d = parseFactAsDecimal(fact(input));
    expect(d.toString()).toBe('1234.56');
    expect(d).toBe(input); // referência preservada
  });

  it('undefined → 0', () => {
    expect(parseFactAsDecimal(undefined).toString()).toBe('0');
  });

  it('string vazia → 0', () => {
    expect(parseFactAsDecimal(fact('')).toString()).toBe('0');
  });

  it('string apenas com símbolos → 0', () => {
    expect(parseFactAsDecimal(fact('R$ ---')).toString()).toBe('0');
  });

  it('NaN/Infinity → 0', () => {
    expect(parseFactAsDecimal(fact(Number.NaN)).toString()).toBe('0');
    expect(parseFactAsDecimal(fact(Number.POSITIVE_INFINITY)).toString()).toBe('0');
  });

  it('negativo pt-BR: "-1.234,56"', () => {
    const d = parseFactAsDecimal(fact('-1.234,56'));
    expect(d.toString()).toBe('-1234.56');
  });

  it('BUG FIX REGRESSION: "1.234,56" não deve perder centavos para 1.234', () => {
    // Bug original: parseFactAsNumber usava replace(',','.') + parseFloat,
    // que em "1.234,56" viraria "1.234.56" → parseFloat retorna 1.234.
    const d = parseFactAsDecimal(fact('1.234,56'));
    expect(d.toNumber()).not.toBe(1.234);
    expect(d.toNumber()).toBe(1234.56);
  });

  it('soma acumulada mantém precisão (100 iterações de 0.1)', () => {
    // Float nativo: 0.1 + 0.1 + ... * 100 = 9.99999... (imprecisão)
    // Decimal.js: exato = 10
    let acc = new Decimal(0);
    for (let i = 0; i < 100; i++) {
      acc = acc.plus(parseFactAsDecimal(fact('0.10')));
    }
    expect(acc.toString()).toBe('10');
  });
});

describe('parseFactAsNumber (delega para Decimal)', () => {
  it('mesmo resultado que parseFactAsDecimal.toNumber()', () => {
    const inputs = ['1.234,56', '1234.56', 'R$ 500,00', '1.234.567,89', ''];
    for (const v of inputs) {
      const d = parseFactAsDecimal(fact(v));
      const n = parseFactAsNumber(fact(v));
      expect(n).toBe(d.toNumber());
    }
  });

  it('não retorna NaN para entradas inválidas', () => {
    expect(Number.isNaN(parseFactAsNumber(undefined))).toBe(false);
    expect(Number.isNaN(parseFactAsNumber(fact('abc')))).toBe(false);
  });
});
