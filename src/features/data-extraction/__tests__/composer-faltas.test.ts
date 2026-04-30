import { describe, expect, it } from 'vitest';
import { composeFaltas, chaveFalta } from '../composer/faltas';
import type { FaltaExtraida } from '../types';

const f = (over: Partial<FaltaExtraida>): FaltaExtraida => ({
  id: 'fa' + Math.random(),
  document_id: 'd1',
  case_id: 'c1',
  data_inicio: '2024-03-15',
  data_fim: '2024-03-15',
  justificada: true,
  reiniciar_periodo_aquisitivo: false,
  justificativa: null,
  incluir: true,
  ...over,
});

describe('composeFaltas', () => {
  it('1 registro → 1 linha', () => {
    const r = composeFaltas([f({})]);
    expect(r.linhas).toHaveLength(1);
    expect(r.conflitos).toHaveLength(0);
  });

  it('incluir=false filtra', () => {
    expect(composeFaltas([f({ incluir: false })]).linhas).toHaveLength(0);
  });

  it('mesma chave (data_inicio,data_fim), valores iguais → dedup', () => {
    const r = composeFaltas([
      f({ id: 'a', justificada: true }),
      f({ id: 'b', justificada: true }),
    ]);
    expect(r.linhas).toHaveLength(1);
    expect(r.conflitos).toHaveLength(0);
  });

  it('mesma chave, justificada divergente → conflito', () => {
    const r = composeFaltas([
      f({ id: 'a', justificada: true }),
      f({ id: 'b', justificada: false }),
    ]);
    expect(r.linhas).toHaveLength(0);
    expect(r.conflitos).toHaveLength(1);
  });

  it('conflito resolvido', () => {
    const chave = chaveFalta('2024-03-15', '2024-03-15');
    const r = composeFaltas(
      [f({ id: 'a', justificada: true }), f({ id: 'b', justificada: false })],
      [{ chave, registro_id: 'b' }],
    );
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].justificada).toBe(false);
  });

  it('chaves distintas → linhas distintas', () => {
    const r = composeFaltas([
      f({ data_inicio: '2024-03-15', data_fim: '2024-03-15' }),
      f({ data_inicio: '2024-04-10', data_fim: '2024-04-10' }),
    ]);
    expect(r.linhas).toHaveLength(2);
  });

  it('ordena linhas por data_inicio crescente', () => {
    const r = composeFaltas([
      f({ data_inicio: '2024-12-01', data_fim: '2024-12-01' }),
      f({ data_inicio: '2024-01-15', data_fim: '2024-01-15' }),
    ]);
    expect(r.linhas[0].data_inicio).toBe('2024-01-15');
  });
});
