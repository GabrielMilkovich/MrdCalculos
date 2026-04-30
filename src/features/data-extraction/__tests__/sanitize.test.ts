import { describe, expect, it } from 'vitest';
import { sanitizeText } from '../export/sanitize';

describe('sanitizeText', () => {
  it('remove ; \\n \\r " (cada um vira espaço)', () => {
    expect(sanitizeText('a; b "c" \n d', 200)).toBe('a  b  c    d');
  });

  it('null/undefined → ""', () => {
    expect(sanitizeText(null, 100)).toBe('');
    expect(sanitizeText(undefined, 100)).toBe('');
  });

  it('trunca em maxLen', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc');
    expect(sanitizeText('a'.repeat(300), 200)).toHaveLength(200);
  });

  it('trim antes de truncar', () => {
    expect(sanitizeText('  hello  ', 100)).toBe('hello');
  });

  it('preserva acentos e chars válidos', () => {
    expect(sanitizeText('Faltou por consulta médica', 100)).toBe(
      'Faltou por consulta médica',
    );
  });
});
