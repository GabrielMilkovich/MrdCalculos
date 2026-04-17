/**
 * Testes — Tabela de Conversão de Moedas (1986-1994) + UFIR.
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  Moeda,
  CONVERSOES,
  moedaVigenteEm,
  converterParaReal,
  estaNoPeriodoURV,
  UFIR_ANUAL,
  ufirDoAno,
  converterUfirParaReal,
} from '../conversao-moedas';

function d(y: number, m1: number, dia: number): Date {
  return new Date(y, m1 - 1, dia, 0, 0, 0, 0);
}

describe('moedaVigenteEm', () => {
  it('identifica CRUZEIRO em 1985', () => {
    expect(moedaVigenteEm(d(1985, 6, 15))).toBe(Moeda.CRUZEIRO);
  });

  it('identifica CRUZADO em 1987', () => {
    expect(moedaVigenteEm(d(1987, 5, 10))).toBe(Moeda.CRUZADO);
  });

  it('identifica CRUZADO_NOVO em 02/1989', () => {
    expect(moedaVigenteEm(d(1989, 2, 1))).toBe(Moeda.CRUZADO_NOVO);
  });

  it('identifica CRUZEIRO_CR após 16/03/1990', () => {
    expect(moedaVigenteEm(d(1991, 1, 1))).toBe(Moeda.CRUZEIRO_CR);
  });

  it('identifica CRUZEIRO_REAL em 1993-10', () => {
    expect(moedaVigenteEm(d(1993, 10, 5))).toBe(Moeda.CRUZEIRO_REAL);
  });

  it('identifica REAL a partir de 01/07/1994', () => {
    expect(moedaVigenteEm(d(1994, 7, 1))).toBe(Moeda.REAL);
    expect(moedaVigenteEm(d(1995, 1, 1))).toBe(Moeda.REAL);
  });
});

describe('converterParaReal — etapas históricas', () => {
  it('CRUZEIRO em 1985 aplica ÷1000 ÷1000 ÷1000 ÷2750', () => {
    // Cr$ (1985) → Cz$ (÷1000) → NCz$ (÷1000) → CR$ (÷1000) → R$ (÷2750)
    const r = converterParaReal('1000000000000', d(1985, 1, 1));
    // 1e12 / (1000 * 1000 * 1000 * 2750) = 1e12 / 2.75e12 ≈ 0.363636...
    expect(r.toFixed(6)).toBe('0.363636');
  });

  it('CRUZADO em 1987 converte via 3 etapas (÷1000 ÷1000 ÷2750)', () => {
    // Cz$ 1000 em 1987 → divide por 1000 (CNovo) → por 1000 (CR$) → por 2750 (R$)
    const r = converterParaReal('1000', d(1987, 6, 15));
    // 1000 / (1000 * 1000 * 2750) = 3.6363e-7
    expect(r.toFixed(12)).toBe('0.000000363636');
  });

  it('CRUZADO_NOVO em 02/1989 converte via 2 etapas (÷1000 ÷2750)', () => {
    // NCz$ 2750000 → ÷1000 (CR$ 2750) → ÷2750 (R$ 1,00)
    const r = converterParaReal('2750000', d(1989, 2, 1));
    expect(r.toFixed(2)).toBe('1.00');
  });

  it('CRUZEIRO_REAL em 1993 converte dividindo apenas por 2750', () => {
    const r = converterParaReal('2750', d(1993, 10, 1));
    expect(r.toFixed(2)).toBe('1.00');
  });

  it('Real em 1995 retorna o próprio valor', () => {
    const r = converterParaReal('1234.56', d(1995, 5, 10));
    expect(r.toFixed(2)).toBe('1234.56');
  });
});

describe('URV — período 1994-03 a 1994-06', () => {
  it('estaNoPeriodoURV cobre exatamente mar-jun/1994', () => {
    expect(estaNoPeriodoURV(d(1994, 2, 28))).toBe(false);
    expect(estaNoPeriodoURV(d(1994, 3, 1))).toBe(true);
    expect(estaNoPeriodoURV(d(1994, 4, 15))).toBe(true);
    expect(estaNoPeriodoURV(d(1994, 6, 30))).toBe(true);
    expect(estaNoPeriodoURV(d(1994, 7, 1))).toBe(false);
  });

  it('URV em 1994-04 divide CR$ pelo valor da URV de abril', () => {
    // CR$ 931,08 em abril/94 ≈ 1 URV ≈ R$ 1,00
    const r = converterParaReal('931.08', d(1994, 4, 10));
    expect(r.toFixed(2)).toBe('1.00');
  });

  it('URV em 30/06/1994 aplica 2750 (paridade final)', () => {
    const r = converterParaReal('2750', d(1994, 6, 30));
    expect(r.toFixed(2)).toBe('1.00');
  });
});

describe('UFIR — índice fiscal 1992-1995', () => {
  it('ufirDoAno retorna valor oficial', () => {
    expect(ufirDoAno(1995).toString()).toBe('0.7061');
    expect(UFIR_ANUAL[1994].toString()).toBe('0.5618');
  });

  it('converterUfirParaReal em 1995 multiplica por 0.7061', () => {
    const r = converterUfirParaReal(new Decimal('100'), d(1995, 8, 10));
    expect(r.toFixed(4)).toBe('70.6100');
  });

  it('converterUfirParaReal em 1993 aplica valor UFIR de 1993', () => {
    const r = converterUfirParaReal(new Decimal('500'), d(1993, 6, 15));
    // 500 * 0.01 = 5.00
    expect(r.toFixed(2)).toBe('5.00');
  });

  it('ufirDoAno lança para ano não disponível', () => {
    expect(() => ufirDoAno(1980)).toThrow();
  });
});

describe('Ordem e consistência das conversões', () => {
  it('CONVERSOES está em ordem cronológica crescente', () => {
    for (let i = 1; i < CONVERSOES.length; i++) {
      expect(CONVERSOES[i].data.getTime()).toBeGreaterThan(
        CONVERSOES[i - 1].data.getTime(),
      );
    }
  });

  it('1000 Cruzado = 1 Cruzado Novo = 1 Cruzeiro 1990 (paridade 16/03/1990)', () => {
    // 1000 Cz$ (1988) convertido deve = 1 NCz$ (1989) convertido = 1 Cr$ (1991) convertido
    const convCz = converterParaReal('1000', d(1988, 6, 1));
    const convNcz = converterParaReal('1', d(1989, 6, 1));
    const convCr = converterParaReal('1', d(1991, 6, 1));
    expect(convCz.toFixed(12)).toBe(convNcz.toFixed(12));
    expect(convNcz.toFixed(12)).toBe(convCr.toFixed(12));
  });
});
