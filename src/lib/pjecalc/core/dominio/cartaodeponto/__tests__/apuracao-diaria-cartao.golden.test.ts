/**
 * ApuracaoDiariaCartao — equals + compareTo (Fase 4)
 *
 * Fidelidade 1-a-1 com ApuracaoDiariaCartao.java v2.15.1:
 *   - equals (L385-394)    — igualdade por id
 *   - compareTo (L397-399) — ordem por dataOcorrencia
 *   - getDataOcorrencia    — alias de getData() (paridade nome Java)
 */
import { describe, it, expect } from 'vitest';

import { ApuracaoDiariaCartao } from '../apuracao-diaria-cartao';

describe('ApuracaoDiariaCartao.equals', () => {
  it('mesma instância: true', () => {
    const a = new ApuracaoDiariaCartao();
    expect(a.equalsApuracaoDiaria(a)).toBe(true);
  });

  it('outro null: false', () => {
    const a = new ApuracaoDiariaCartao();
    expect(a.equalsApuracaoDiaria(null)).toBe(false);
    expect(a.equalsApuracaoDiaria(undefined)).toBe(false);
  });

  it('outro tipo (string): false', () => {
    const a = new ApuracaoDiariaCartao();
    expect(a.equalsApuracaoDiaria('nope')).toBe(false);
  });

  it('ids iguais: true', () => {
    const a = new ApuracaoDiariaCartao();
    const b = new ApuracaoDiariaCartao();
    a.setId(42);
    b.setId(42);
    expect(a.equalsApuracaoDiaria(b)).toBe(true);
  });

  it('ids diferentes: false', () => {
    const a = new ApuracaoDiariaCartao();
    const b = new ApuracaoDiariaCartao();
    a.setId(42);
    b.setId(43);
    expect(a.equalsApuracaoDiaria(b)).toBe(false);
  });

  it('ambos id null: true (paridade Java ternário)', () => {
    const a = new ApuracaoDiariaCartao();
    const b = new ApuracaoDiariaCartao();
    expect(a.equalsApuracaoDiaria(b)).toBe(true);
  });

  it('this.id null, other.id != null: false', () => {
    const a = new ApuracaoDiariaCartao();
    const b = new ApuracaoDiariaCartao();
    b.setId(1);
    expect(a.equalsApuracaoDiaria(b)).toBe(false);
  });
});

describe('ApuracaoDiariaCartao.compareTo (ordem por dataOcorrencia)', () => {
  function make(data: Date | null): ApuracaoDiariaCartao {
    const a = new ApuracaoDiariaCartao();
    a.setData(data);
    return a;
  }

  it('data menor → -1', () => {
    const a = make(new Date('2023-03-01'));
    const b = make(new Date('2023-03-15'));
    expect(a.compareTo(b)).toBe(-1);
  });

  it('data maior → 1', () => {
    const a = make(new Date('2023-04-01'));
    const b = make(new Date('2023-03-15'));
    expect(a.compareTo(b)).toBe(1);
  });

  it('datas iguais → 0', () => {
    const a = make(new Date('2023-03-01'));
    const b = make(new Date('2023-03-01'));
    expect(a.compareTo(b)).toBe(0);
  });

  it('ambas null → 0', () => {
    const a = make(null);
    const b = make(null);
    expect(a.compareTo(b)).toBe(0);
  });

  it('this null, other não-null → 1 (null vai ao fim)', () => {
    const a = make(null);
    const b = make(new Date('2023-03-01'));
    expect(a.compareTo(b)).toBe(1);
  });

  it('this não-null, other null → -1', () => {
    const a = make(new Date('2023-03-01'));
    const b = make(null);
    expect(a.compareTo(b)).toBe(-1);
  });

  it('uso prático: Array.sort produz ordem ascendente', () => {
    const xs = [
      make(new Date('2023-03-15')),
      make(new Date('2023-01-01')),
      make(new Date('2023-06-30')),
    ];
    xs.sort((x, y) => x.compareTo(y));
    expect(xs[0].getData()?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    expect(xs[1].getData()?.toISOString()).toBe('2023-03-15T00:00:00.000Z');
    expect(xs[2].getData()?.toISOString()).toBe('2023-06-30T00:00:00.000Z');
  });
});

describe('ApuracaoDiariaCartao.getDataOcorrencia (alias)', () => {
  it('reflete setData', () => {
    const a = new ApuracaoDiariaCartao();
    const d = new Date('2024-07-14');
    a.setData(d);
    expect(a.getDataOcorrencia()).toBe(d);
  });

  it('null quando não setado', () => {
    const a = new ApuracaoDiariaCartao();
    expect(a.getDataOcorrencia()).toBeNull();
  });
});
