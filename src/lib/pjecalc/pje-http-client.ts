/**
 * PJeJudicialClient — cliente HTTP para o serviço PJe-Calc do tribunal.
 *
 * Responsabilidades:
 *   - Envio do pacote ZIP+Base64 gerado por `gerarPacotePJe`
 *   - Consulta de status de um envio anterior
 *   - Cancelamento
 *
 * Retries + error handling via `retry-fetch`.
 *
 * TODO: Autenticação mTLS com certificado ICP-Brasil A1/A3 (`certPem`)
 *       requer uma biblioteca Node nativa (https.Agent) e ambiente real.
 *       Por ora passamos apenas API key no header.
 */

import type { PacotePJeResult } from './pje-integration';
import { jsonFetch, retryFetch, type RetryConfig } from '../http/retry-fetch';

export interface PJeClientConfig {
  baseUrl: string;
  apiKey?: string;
  /** PEM do certificado ICP-Brasil — TODO: ainda não utilizado. */
  certPem?: string;
  retryConfig?: RetryConfig;
}

export interface EnvioResposta {
  id: string;
  protocolo: string;
}

export interface StatusResposta {
  status: string;
  mensagem?: string;
}

export class PJeAPIError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    responseBody: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = 'PJeAPIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.retryable = retryable;
  }
}

function buildHeaders(cfg: PJeClientConfig, contentType?: string): Headers {
  const h = new Headers();
  if (cfg.apiKey) h.set('Authorization', `Bearer ${cfg.apiKey}`);
  h.set('Accept', 'application/json');
  if (contentType) h.set('Content-Type', contentType);
  return h;
}

/** Normaliza baseUrl removendo trailing slash. */
function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/** Lê body como texto de forma segura. */
async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export class PJeJudicialClient {
  private readonly baseUrl: string;
  private readonly config: PJeClientConfig;

  constructor(config: PJeClientConfig) {
    if (!config.baseUrl) {
      throw new Error('PJeJudicialClient: baseUrl é obrigatório');
    }
    this.config = config;
    this.baseUrl = normalizeBase(config.baseUrl);
  }

  /**
   * Envia o pacote PJe. Espera um payload JSON com zip_base64 + manifesto.
   * Retorna o id e o protocolo gerado pelo tribunal.
   */
  async enviarPacote(pacote: PacotePJeResult): Promise<EnvioResposta> {
    const url = `${this.baseUrl}/calculo/envio`;
    const headers = buildHeaders(this.config, 'application/json');
    const body = JSON.stringify({
      zip_base64: pacote.zip_base64,
      manifesto: pacote.manifesto,
      zip_size_bytes: pacote.zip_size_bytes,
    });
    try {
      return await jsonFetch<EnvioResposta>(
        url,
        { method: 'POST', headers, body },
        this.config.retryConfig,
      );
    } catch (err) {
      throw this.wrapError(err, 'Falha ao enviar pacote PJe');
    }
  }

  /** Consulta o status de um envio. */
  async consultarStatus(id: string): Promise<StatusResposta> {
    if (!id) throw new Error('consultarStatus: id é obrigatório');
    const url = `${this.baseUrl}/calculo/status/${encodeURIComponent(id)}`;
    const headers = buildHeaders(this.config);
    try {
      return await jsonFetch<StatusResposta>(
        url,
        { method: 'GET', headers },
        this.config.retryConfig,
      );
    } catch (err) {
      throw this.wrapError(err, `Falha ao consultar status ${id}`);
    }
  }

  /** Cancela um envio em andamento. */
  async cancelar(id: string): Promise<void> {
    if (!id) throw new Error('cancelar: id é obrigatório');
    const url = `${this.baseUrl}/calculo/${encodeURIComponent(id)}`;
    const headers = buildHeaders(this.config);
    const response = await retryFetch(
      url,
      { method: 'DELETE', headers },
      this.config.retryConfig,
    );
    if (!response.ok) {
      const body = await readBody(response);
      throw new PJeAPIError(
        `Falha ao cancelar ${id}: HTTP ${response.status}`,
        response.status,
        body,
        response.status >= 500,
      );
    }
  }

  /** Converte um erro (HTTPError do jsonFetch ou genérico) em PJeAPIError. */
  private wrapError(err: unknown, context: string): PJeAPIError {
    if (err instanceof PJeAPIError) return err;
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      const e = err as { status: number; body: string; message?: string };
      return new PJeAPIError(
        `${context}: ${e.message ?? ''}`.trim(),
        e.status,
        e.body,
        e.status >= 500,
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return new PJeAPIError(`${context}: ${msg}`, 0, '', true);
  }
}

/** Endpoint placeholder — em produção deve vir do tribunal específico. */
export const PJE_DEFAULT_BASE_URL = 'https://pje.jus.br/api';
