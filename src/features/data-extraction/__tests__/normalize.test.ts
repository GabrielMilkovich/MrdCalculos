import { describe, expect, it } from 'vitest';
import { normalizeNomeRubrica } from '../classification/normalize';

describe('normalizeNomeRubrica', () => {
  it('lowercase + remove acento + collapse espaços', () => {
    expect(normalizeNomeRubrica('  COMISSÕES  ')).toBe('comissoes');
    expect(normalizeNomeRubrica('Premiação')).toBe('premiacao');
    expect(normalizeNomeRubrica('DSR(Comissão)')).toBe('dsr(comissao)');
    expect(normalizeNomeRubrica('PRESTACAO    DE    CARNE')).toBe('prestacao de carne');
  });

  it('preserva pontuação não-acento', () => {
    expect(normalizeNomeRubrica('COM. GARANTIA')).toBe('com. garantia');
    expect(normalizeNomeRubrica('DSR(Comissão)')).toBe('dsr(comissao)');
  });

  it('idempotente', () => {
    const x = 'comissoes';
    expect(normalizeNomeRubrica(normalizeNomeRubrica(x))).toBe(x);
  });

  it('string vazia / só espaços', () => {
    expect(normalizeNomeRubrica('')).toBe('');
    expect(normalizeNomeRubrica('   ')).toBe('');
  });
});
