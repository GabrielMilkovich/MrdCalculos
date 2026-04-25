/**
 * Testes: indices-loader — DB + fallback
 */
import { describe, it, expect, vi } from 'vitest';
import { loadIndices, type IndicesSupabaseClient } from '../indices-loader';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO } from '../indices-fallback';

interface FakeRow {
  competencia: string;
  acumulado: number | null;
  valor: number;
}

type FakeResult = {
  data: FakeRow[] | null;
  error: { message: string } | null;
};

type Resolver = FakeResult | (() => FakeResult | Promise<FakeResult>);

function fakeClient(result: Resolver): IndicesSupabaseClient {
  const resolver: () => FakeResult | Promise<FakeResult> =
    typeof result === 'function' ? (result as () => FakeResult) : () => result;
  const lte = vi.fn(async () => {
    const r = await resolver();
    return r;
  });
  const gte = vi.fn(() => ({ lte }));
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as IndicesSupabaseClient;
}

describe('indices-loader', () => {
  it('carrega do DB quando disponível (DB tem prioridade sobre fallback)', async () => {
    const rows: FakeRow[] = [
      { competencia: '2024-01-01', acumulado: 999.9, valor: 0.5 },
      { competencia: '2024-02-01', acumulado: 1001.1, valor: 0.4 },
    ];
    const client = fakeClient({ data: rows, error: null });
    const out = await loadIndices('IPCA-E', '2024-01', '2024-02', {
      client,
      silent: true,
    });
    expect(out['2024-01']).toBe(999.9);
    expect(out['2024-02']).toBe(1001.1);
    expect(out['2024-01']).not.toBe(IPCA_E_ACUMULADO['2024-01']);
  });

  it('usa fallback quando DB retorna vazio', async () => {
    const client = fakeClient({ data: [], error: null });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await loadIndices('SELIC', '2023-01', '2023-03', { client });
    expect(out['2023-01']).toBe(SELIC_ACUMULADO['2023-01']);
    expect(out['2023-02']).toBe(SELIC_ACUMULADO['2023-02']);
    expect(out['2023-03']).toBe(SELIC_ACUMULADO['2023-03']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('mescla DB + fallback quando DB é parcial', async () => {
    const rows: FakeRow[] = [
      { competencia: '2024-01-01', acumulado: 555.5, valor: 0.5 },
    ];
    const client = fakeClient({ data: rows, error: null });
    const out = await loadIndices('IPCA-E', '2024-01', '2024-02', {
      client,
      silent: true,
    });
    expect(out['2024-01']).toBe(555.5); // DB
    expect(out['2024-02']).toBe(IPCA_E_ACUMULADO['2024-02']); // fallback
  });

  it('volta para fallback quando o DB retorna erro (simula erro de rede)', async () => {
    const client = fakeClient({
      data: null,
      error: { message: 'network failure' },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await loadIndices('IPCA-E', '2023-06', '2023-08', { client });
    expect(out['2023-06']).toBe(IPCA_E_ACUMULADO['2023-06']);
    expect(out['2023-07']).toBe(IPCA_E_ACUMULADO['2023-07']);
    expect(out['2023-08']).toBe(IPCA_E_ACUMULADO['2023-08']);
    // logger.warn em dev formata como console.warn(colorPrefix, color, message)
    // — verificamos que algum arg da chamada contém 'erro DB'.
    const calls = warn.mock.calls.flat();
    expect(calls.some(c => typeof c === 'string' && c.includes('erro DB'))).toBe(true);
    warn.mockRestore();
  });

  it('volta para fallback quando chamada do client lança exceção', async () => {
    const client = fakeClient(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await loadIndices('SELIC', '2023-01', '2023-02', { client });
    expect(out['2023-01']).toBe(SELIC_ACUMULADO['2023-01']);
    const calls2 = warn.mock.calls.flat();
    expect(calls2.some(c => typeof c === 'string' && c.includes('exceção DB'))).toBe(true);
    warn.mockRestore();
  });

  it('ignora rows do DB com acumulado null e mantém fallback', async () => {
    const rows: FakeRow[] = [
      { competencia: '2024-01-01', acumulado: null, valor: 0.5 },
    ];
    const client = fakeClient({ data: rows, error: null });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await loadIndices('IPCA-E', '2024-01', '2024-01', { client });
    expect(out['2024-01']).toBe(IPCA_E_ACUMULADO['2024-01']);
    warn.mockRestore();
  });
});
