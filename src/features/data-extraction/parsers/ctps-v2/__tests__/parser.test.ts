import { describe, it, expect } from 'vitest';
import { parseFichaAnotacoes } from '../../../../../../supabase/functions/_shared/parsers/ctps-v2/parser';

describe('CTPS v2 — parser (Fase 1 = skeleton)', () => {
  it('deve existir o módulo parseFichaAnotacoes', () => {
    expect(typeof parseFichaAnotacoes).toBe('function');
  });
});
