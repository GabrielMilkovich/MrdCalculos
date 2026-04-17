/**
 * Testes de `ESocialClient`.
 *
 * Cobre:
 *  - Envio de XML S-2500 (POST application/xml + headers ambiente/layout)
 *  - Consulta de evento via GET
 *  - Erro 500 vira ESocialAPIError retryable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ESocialClient,
  ESocialAPIError,
  ESOCIAL_DEFAULT_BASE_URL,
  ESOCIAL_DEFAULT_LAYOUT,
} from '../esocial-http-client';

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

describe('ESocialClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enviarEvento envia XML e extrai protocolo JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, '{"protocolo":"PROTO-999"}'),
    );
    const client = new ESocialClient({
      baseUrl: ESOCIAL_DEFAULT_BASE_URL,
      ambiente: 'teste',
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    const xml = '<eSocial><evtTSVInicio/></eSocial>';
    const res = await client.enviarEvento(xml, 'S-2500');
    expect(res.protocolo).toBe('PROTO-999');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/eventos?tipo=S-2500');
    expect(opts.method).toBe('POST');
    const headers = opts.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/xml');
    expect(headers.get('X-eSocial-Versao-Layout')).toBe(
      ESOCIAL_DEFAULT_LAYOUT,
    );
    expect(headers.get('X-eSocial-Ambiente')).toBe('3');
    expect(opts.body).toBe(xml);
  });

  it('consultarEvento faz GET e retorna status', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, '{"status":"SUCESSO"}'),
    );
    const client = new ESocialClient({
      baseUrl: ESOCIAL_DEFAULT_BASE_URL,
      ambiente: 'producao',
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    const res = await client.consultarEvento('PROTO-999');
    expect(res.status).toBe('SUCESSO');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ESOCIAL_DEFAULT_BASE_URL}/eventos/PROTO-999`);
    expect(opts.method).toBe('GET');
    const headers = opts.headers as Headers;
    expect(headers.get('X-eSocial-Ambiente')).toBe('1');
  });

  it('erro 500 vira ESocialAPIError retryable=true', async () => {
    fetchMock.mockResolvedValue(mockResponse(500, 'upstream down'));
    const client = new ESocialClient({
      baseUrl: ESOCIAL_DEFAULT_BASE_URL,
      ambiente: 'teste',
      retryConfig: { baseDelayMs: 1, maxRetries: 1 },
    });
    try {
      await client.enviarEvento('<eSocial/>', 'S-2501');
      expect.fail('deveria ter lancado ESocialAPIError');
    } catch (err) {
      expect(err).toBeInstanceOf(ESocialAPIError);
      const e = err as ESocialAPIError;
      expect(e.statusCode).toBe(500);
      expect(e.retryable).toBe(true);
      expect(e.responseBody).toContain('upstream');
    }
    // maxRetries=1 -> 2 tentativas total.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
