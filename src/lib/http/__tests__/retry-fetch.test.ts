/**
 * Testes de `retry-fetch`.
 *
 * Cobre:
 *  - Sucesso em primeira tentativa
 *  - Retry em resposta 500 seguida de 200
 *  - Nao-retry em 400 (erro do cliente)
 *  - Backoff exponencial (delays sao 2^n * base)
 *  - Aborto via AbortSignal
 *  - retryOn custom (ex. retry em 429)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryFetch, jsonFetch, resolveRetryConfig } from '../retry-fetch';

function mockResponse(status: number, body: string = ''): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('retry-fetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retorna resposta quando sucede na primeira tentativa', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, '{"ok":true}'));
    const res = await retryFetch('https://api.test/endpoint', undefined, {
      baseDelayMs: 1,
    });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retenta em 500 e retorna sucesso final', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(500, 'err'))
      .mockResolvedValueOnce(mockResponse(500, 'err'))
      .mockResolvedValueOnce(mockResponse(200, 'ok'));
    const res = await retryFetch('https://api.test/endpoint', undefined, {
      baseDelayMs: 1,
      maxRetries: 4,
    });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('NAO retenta em 400 (erro do cliente)', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(400, 'bad req'));
    const res = await retryFetch('https://api.test/endpoint', undefined, {
      baseDelayMs: 1,
      maxRetries: 4,
    });
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aplica backoff exponencial (1, 2, 4 * base)', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, 'ok'));

    const promise = retryFetch('https://api.test/endpoint', undefined, {
      baseDelayMs: 1000,
      maxRetries: 4,
    });

    // 1a tentativa imediata.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Apos 1a falha espera 1000ms.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Apos 2a falha espera 2000ms.
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Apos 3a falha espera 4000ms, entao sucesso.
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const res = await promise;
    expect(res.status).toBe(200);
  });

  it('aborta imediatamente quando signal eh disparado', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async (_url, opts?: RequestInit) => {
      if (opts?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return mockResponse(500);
    });

    // Aborta antes da chamada.
    controller.abort();
    await expect(
      retryFetch(
        'https://api.test/endpoint',
        { signal: controller.signal },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow(/Aborted/);
  });

  it('respeita retryOn custom — retenta em 429', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(429, 'rate'))
      .mockResolvedValueOnce(mockResponse(200, 'ok'));

    const res = await retryFetch('https://api.test/endpoint', undefined, {
      baseDelayMs: 1,
      maxRetries: 2,
      retryOn: (status) => status === 429 || status >= 500,
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('jsonFetch parseia JSON em sucesso', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, '{"x":42}'));
    const data = await jsonFetch<{ x: number }>(
      'https://api.test/endpoint',
      undefined,
      { baseDelayMs: 1 },
    );
    expect(data.x).toBe(42);
  });

  it('jsonFetch lanca em status >=400 com body', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(404, 'not found'));
    await expect(
      jsonFetch('https://api.test/endpoint', undefined, { baseDelayMs: 1 }),
    ).rejects.toMatchObject({ status: 404, body: 'not found' });
  });

  it('resolveRetryConfig aplica defaults', () => {
    const cfg = resolveRetryConfig();
    expect(cfg.maxRetries).toBe(4);
    expect(cfg.baseDelayMs).toBe(1000);
    expect(cfg.maxDelayMs).toBe(30000);
    expect(cfg.retryOn(500, undefined)).toBe(true);
    expect(cfg.retryOn(400, undefined)).toBe(false);
    expect(cfg.retryOn(0, new Error('net'))).toBe(true);
  });
});
