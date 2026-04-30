import { describe, expect, it } from 'vitest';
import { composeFerias } from '../composer/ferias';
import type { FeriasExtraida } from '../types';

const f = (over: Partial<FeriasExtraida>): FeriasExtraida => ({
  id: 'f' + Math.random(),
  document_id: 'd1',
  case_id: 'c1',
  relativa: '2023/2024',
  prazo: 30,
  situacao: 'G',
  dobra_geral: false,
  abono: false,
  dias_abono: 0,
  gozo1: null,
  gozo2: null,
  gozo3: null,
  incluir: true,
  ...over,
});

describe('composeFerias', () => {
  it('1 registro → 1 linha', () => {
    const r = composeFerias([f({})]);
    expect(r.linhas).toHaveLength(1);
    expect(r.conflitos).toHaveLength(0);
  });

  it('incluir=false é filtrado', () => {
    const r = composeFerias([f({ incluir: false })]);
    expect(r.linhas).toHaveLength(0);
  });

  it('2 iguais com mesma relativa → dedup', () => {
    const r = composeFerias([
      f({ id: 'a', relativa: '2023/2024' }),
      f({ id: 'b', relativa: '2023/2024' }),
    ]);
    expect(r.linhas).toHaveLength(1);
    expect(r.conflitos).toHaveLength(0);
  });

  it('2 divergentes mesma relativa → 1 conflito', () => {
    const r = composeFerias([
      f({ id: 'a', relativa: '2023/2024', prazo: 30 }),
      f({ id: 'b', relativa: '2023/2024', prazo: 20 }),
    ]);
    expect(r.linhas).toHaveLength(0);
    expect(r.conflitos).toHaveLength(1);
    expect(r.conflitos[0].candidatos).toHaveLength(2);
  });

  it('conflito resolvido → 1 linha escolhida', () => {
    const r = composeFerias(
      [
        f({ id: 'a', relativa: '2023/2024', prazo: 30 }),
        f({ id: 'b', relativa: '2023/2024', prazo: 20 }),
      ],
      [{ relativa: '2023/2024', registro_id: 'b' }],
    );
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].prazo).toBe(20);
    expect(r.conflitos).toHaveLength(0);
  });

  it('relativas distintas → linhas distintas', () => {
    const r = composeFerias([
      f({ relativa: '2022/2023' }),
      f({ relativa: '2023/2024' }),
    ]);
    expect(r.linhas).toHaveLength(2);
  });
});
