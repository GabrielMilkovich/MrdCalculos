/**
 * Testes de `PJeJudicialClient`.
 *
 * Cobre:
 *  - Envio de pacote OK (payload JSON + Authorization header)
 *  - Consulta de status
 *  - Erro 4xx nao eh retentado e vira PJeAPIError
 *  - Cancelamento via DELETE
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PJeJudicialClient,
  PJeAPIError,
  PJE_DEFAULT_BASE_URL,
} from '../pje-http-client';
import type { PacotePJeResult } from '../pje-integration';

function mockResponse(
  status: number,
  body: string = '',
  contentType: string = 'application/json',
): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': contentType },
  });
}

function pacoteFake(): PacotePJeResult {
  return {
    zip_base64: 'UEsDBAoAAAAAAA==',
    zip_size_bytes: 123,
    manifesto: {
      processo: '0000001-23.2024.5.02.0001',
      versao: '1.0.0',
      timestamp: '2024-01-01T00:00:00Z',
      arquivos: [],
    },
  };
}

describe('PJeJudicialClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enviarPacote faz POST com JSON e Authorization', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, '{"id":"abc-1","protocolo":"P-42"}'),
    );
    const client = new PJeJudicialClient({
      baseUrl: PJE_DEFAULT_BASE_URL,
      apiKey: 'secret-key',
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    const res = await client.enviarPacote(pacoteFake());
    expect(res).toEqual({ id: 'abc-1', protocolo: 'P-42' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PJE_DEFAULT_BASE_URL}/calculo/envio`);
    expect(opts.method).toBe('POST');
    const headers = opts.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer secret-key');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(typeof opts.body).toBe('string');
    const parsed = JSON.parse(opts.body as string) as {
      zip_base64: string;
      zip_size_bytes: number;
    };
    expect(parsed.zip_base64).toBe('UEsDBAoAAAAAAA==');
    expect(parsed.zip_size_bytes).toBe(123);
  });

  it('consultarStatus faz GET e parseia JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        200,
        '{"status":"PROCESSANDO","mensagem":"na fila"}',
      ),
    );
    const client = new PJeJudicialClient({
      baseUrl: PJE_DEFAULT_BASE_URL,
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    const res = await client.consultarStatus('abc-1');
    expect(res).toEqual({ status: 'PROCESSANDO', mensagem: 'na fila' });
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PJE_DEFAULT_BASE_URL}/calculo/status/abc-1`);
    expect(opts.method).toBe('GET');
  });

  it('erro 4xx nao eh retentado e vira PJeAPIError nao retryable', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(403, '{"erro":"forbidden"}'),
    );
    const client = new PJeJudicialClient({
      baseUrl: PJE_DEFAULT_BASE_URL,
      apiKey: 'k',
      retryConfig: { baseDelayMs: 1, maxRetries: 4 },
    });
    try {
      await client.enviarPacote(pacoteFake());
      expect.fail('deveria ter lancado PJeAPIError');
    } catch (err) {
      expect(err).toBeInstanceOf(PJeAPIError);
      const e = err as PJeAPIError;
      expect(e.statusCode).toBe(403);
      expect(e.retryable).toBe(false);
      expect(e.responseBody).toContain('forbidden');
    }
    // So uma chamada — 4xx nao eh retentado.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cancelar faz DELETE e resolve em 200', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, ''));
    const client = new PJeJudicialClient({
      baseUrl: PJE_DEFAULT_BASE_URL,
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    await expect(client.cancelar('abc-1')).resolves.toBeUndefined();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${PJE_DEFAULT_BASE_URL}/calculo/abc-1`);
    expect(opts.method).toBe('DELETE');
  });

  it('cancelar propaga PJeAPIError em 500', async () => {
    fetchMock
      .mockResolvedValue(mockResponse(500, 'down'));
    const client = new PJeJudicialClient({
      baseUrl: PJE_DEFAULT_BASE_URL,
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    await expect(client.cancelar('abc-1')).rejects.toBeInstanceOf(
      PJeAPIError,
    );
  });
});
