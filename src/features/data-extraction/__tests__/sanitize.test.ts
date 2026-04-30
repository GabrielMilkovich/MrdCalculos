import { describe, expect, it } from 'vitest';
import {
  formatBool,
  formatDecimalBR,
  sanitizeText,
  validateCompetencia,
  validateData,
  validateRelativa,
} from '../sanitize';

describe('sanitizeText', () => {
  it('remove ; \\n \\r " e trunca', () => {
    // Cada char inválido vira 1 espaço (preserva separação visual).
    // Input:  'Atestado; "médico"\nlinha 2' (8 + ;  + sp + " + 6 + " + nl + 7)
    // Output: 'Atestado' + ' ' (do ;) + ' ' + ' ' (do ") + 'médico' + ' ' (do ") + ' ' (do nl) + 'linha 2'
    expect(sanitizeText('Atestado; "médico"\nlinha 2', 200)).toBe('Atestado   médico  linha 2');
  });

  it('trunca em maxLen', () => {
    expect(sanitizeText('a'.repeat(300), 200)).toHaveLength(200);
  });

  it('null/undefined → string vazia', () => {
    expect(sanitizeText(null, 100)).toBe('');
    expect(sanitizeText(undefined, 100)).toBe('');
  });

  it('preserva chars válidos (acentos, espaços)', () => {
    expect(sanitizeText('Faltou por consulta médica', 100)).toBe('Faltou por consulta médica');
  });

  it('faz trim antes de truncar', () => {
    expect(sanitizeText('  hello  ', 100)).toBe('hello');
  });
});

describe('formatDecimalBR', () => {
  it('vírgula como separador, sem milhar, 2 casas', () => {
    expect(formatDecimalBR(3500.5)).toBe('3500,50');
    expect(formatDecimalBR(12345.67)).toBe('12345,67');
    expect(formatDecimalBR(0)).toBe('0,00');
  });

  it('NaN/Infinity → 0,00 (defensivo)', () => {
    expect(formatDecimalBR(NaN)).toBe('0,00');
    expect(formatDecimalBR(Infinity)).toBe('0,00');
    expect(formatDecimalBR(-Infinity)).toBe('0,00');
  });

  it('arredonda em 2 casas (banker rounding via toFixed)', () => {
    expect(formatDecimalBR(1.005)).toMatch(/^1,0[01]$/); // 1,00 ou 1,01 dependendo de impl
  });

  it('aceita custom decimais', () => {
    expect(formatDecimalBR(1.2345, 4)).toBe('1,2345');
  });
});

describe('formatBool', () => {
  it('S quando true, N quando false', () => {
    expect(formatBool(true)).toBe('S');
    expect(formatBool(false)).toBe('N');
  });
});

describe('validateCompetencia', () => {
  it('aceita MM/yyyy válido', () => {
    expect(validateCompetencia('03/2024')).toBe('03/2024');
    expect(validateCompetencia('12/1999')).toBe('12/1999');
  });

  it('rejeita formatos inválidos', () => {
    expect(validateCompetencia('3/2024')).toBe('');
    expect(validateCompetencia('13/2024')).toBe('');
    expect(validateCompetencia('00/2024')).toBe('');
    expect(validateCompetencia('2024/03')).toBe('');
    expect(validateCompetencia('')).toBe('');
  });
});

describe('validateData', () => {
  it('aceita dd/MM/yyyy válido', () => {
    expect(validateData('15/03/2024')).toBe('15/03/2024');
    expect(validateData('01/01/2000')).toBe('01/01/2000');
    expect(validateData('31/12/2024')).toBe('31/12/2024');
  });

  it('rejeita inválidos', () => {
    expect(validateData('32/03/2024')).toBe('');
    expect(validateData('15/13/2024')).toBe('');
    expect(validateData('2024-03-15')).toBe('');
  });
});

describe('validateRelativa', () => {
  it('aceita aaaa/aaaa', () => {
    expect(validateRelativa('2023/2024')).toBe('2023/2024');
  });

  it('rejeita formato errado', () => {
    expect(validateRelativa('23/24')).toBe('');
    expect(validateRelativa('2023')).toBe('');
    expect(validateRelativa('2023-2024')).toBe('');
  });
});
