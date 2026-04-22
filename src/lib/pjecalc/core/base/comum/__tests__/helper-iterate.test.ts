/**
 * Testes de HelperIterate — Fase 1.
 */
import { describe, it, expect } from 'vitest';
import { HelperIterate } from '../helper-iterate';

describe('HelperIterate', () => {
  it('iterate/where retorna true quando ao menos um item satisfaz', () => {
    const itens = [1, 2, 3, 4];
    expect(HelperIterate.iterate(itens).where((x) => x > 2)).toBe(true);
  });

  it('retorna false quando nenhum satisfaz', () => {
    const itens = [1, 2];
    expect(HelperIterate.iterate(itens).where((x) => x > 100)).toBe(false);
  });

  it('coleção null/undefined retorna false sem iterar', () => {
    expect(HelperIterate.iterate<number>(null).where(() => true)).toBe(false);
    expect(HelperIterate.iterate<number>(undefined).where(() => true)).toBe(false);
  });

  it('aceita qualquer Iterable (Set, geradores)', () => {
    const set = new Set([10, 20, 30]);
    expect(HelperIterate.iterate(set).where((x) => x === 20)).toBe(true);

    function* gen(): Generator<number> {
      yield 1;
      yield 2;
      yield 3;
    }
    expect(HelperIterate.iterate(gen()).where((x) => x === 3)).toBe(true);
  });

  it('coleção vazia retorna false', () => {
    expect(HelperIterate.iterate<number>([]).where(() => true)).toBe(false);
  });
});
