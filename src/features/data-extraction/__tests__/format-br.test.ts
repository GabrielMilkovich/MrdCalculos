import { describe, expect, it } from 'vitest';
import { formatBoolBR, formatDataBR, formatNumeroBR } from '../export/format-br';

describe('formatNumeroBR', () => {
  it('vírgula como separador, sem milhar', () => {
    expect(formatNumeroBR(3500.5)).toBe('3500,50');
    expect(formatNumeroBR(12345.67)).toBe('12345,67');
    expect(formatNumeroBR(0)).toBe('0,00');
  });

  it('arredonda para 2 casas via toFixed', () => {
    expect(formatNumeroBR(3500.567)).toBe('3500,57');
  });

  it('NaN/Infinity → 0,00 defensivo', () => {
    expect(formatNumeroBR(NaN)).toBe('0,00');
    expect(formatNumeroBR(Infinity)).toBe('0,00');
    expect(formatNumeroBR(-Infinity)).toBe('0,00');
  });

  it('aceita custom decimals', () => {
    expect(formatNumeroBR(1.2345, 4)).toBe('1,2345');
  });
});

describe('formatBoolBR', () => {
  it('S / N', () => {
    expect(formatBoolBR(true)).toBe('S');
    expect(formatBoolBR(false)).toBe('N');
  });
});

describe('formatDataBR', () => {
  it('ISO yyyy-mm-dd → dd/MM/yyyy', () => {
    expect(formatDataBR('2024-03-15')).toBe('15/03/2024');
    expect(formatDataBR('2000-01-01')).toBe('01/01/2000');
  });

  it('idempotente para dd/MM/yyyy', () => {
    expect(formatDataBR('15/03/2024')).toBe('15/03/2024');
  });

  it('inválido → string vazia', () => {
    expect(formatDataBR('garbage')).toBe('');
    expect(formatDataBR('')).toBe('');
  });
});
