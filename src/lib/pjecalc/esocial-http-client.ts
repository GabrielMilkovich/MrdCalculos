/**
 * ESocialClient — cliente HTTP para envio de eventos S-2500 / S-2501 ao eSocial.
 *
 * Usa o webservice REST oficial em modo "JSON+XML simples":
 *   POST  /eventos       Content-Type: application/xml (corpo = XML do evento)
 *   GET   /eventos/:proto  retorna JSON com status
 *
 * TODO (fora de escopo desta task):
 *   - SOAP envelope (caso o tribunal exija wsdl em vez de REST)
 *   - Autenticação mTLS com certificado ICP-Brasil
 *   - Assinatura digital XMLDSig do evento
 */

import { jsonFetch, retryFetch, type RetryConfig } from '../http/retry-fetch';

export type ESocialAmbiente = 'producao' | 'restrita' | 'teste';
export type ESocialEventoTipo = 'S-2500' | 'S-2501';

export interface ESocialClientConfig {
  baseUrl: string;
  ambiente: ESocialAmbiente;
  /** Versão do layout eSocial (default S-1.2). */
  versaoLayout?: string;
  retryConfig?: RetryConfig;
}

export interface EnvioEventoResposta {
  protocolo: string;
}

export interface ConsultaEventoResposta {
  status: string;
  mensagem?: string;
}

export class ESocialAPIError extends Error {
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
    this.name = 'ESocialAPIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.retryable = retryable;
  }
}

const AMBIENTE_CODE: Record<ESocialAmbiente, string> = {
  producao: '1',
  restrita: '2',
  teste: '3',
};

export const ESOCIAL_DEFAULT_LAYOUT = 'S-1.2';
export const ESOCIAL_DEFAULT_BASE_URL = 'https://esocial.gov.br/ws';

function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export class ESocialClient {
  private readonly baseUrl: string;
  private readonly config: ESocialClientConfig;

  constructor(config: ESocialClientConfig) {
    if (!config.baseUrl) {
      throw new Error('ESocialClient: baseUrl é obrigatório');
    }
    if (!['producao', 'restrita', 'teste'].includes(config.ambiente)) {
      throw new Error(
        `ESocialClient: ambiente inválido "${config.ambiente}"`,
      );
    }
    this.config = config;
    this.baseUrl = normalizeBase(config.baseUrl);
  }

  /** Monta headers específicos do eSocial. */
  private baseHeaders(contentType: string): Headers {
    const h = new Headers();
    h.set('Content-Type', contentType);
    h.set('Accept', 'application/json');
    h.set(
      'X-eSocial-Versao-Layout',
      this.config.versaoLayout ?? ESOCIAL_DEFAULT_LAYOUT,
    );
    h.set('X-eSocial-Ambiente', AMBIENTE_CODE[this.config.ambiente]);
    return h;
  }

  /**
   * Envia um evento S-2500 ou S-2501. O XML deve estar completo (envelope
   * `<eSocial xmlns=...>` com assinatura quando exigida em produção).
   */
  async enviarEvento(
    eventoXml: string,
    tipo: ESocialEventoTipo,
  ): Promise<EnvioEventoResposta> {
    if (!eventoXml || !eventoXml.trim().startsWith('<')) {
      throw new Error('enviarEvento: XML inválido');
    }
    if (tipo !== 'S-2500' && tipo !== 'S-2501') {
      throw new Error(`enviarEvento: tipo inválido "${tipo}"`);
    }
    const url = `${this.baseUrl}/eventos?tipo=${encodeURIComponent(tipo)}`;
    const headers = this.baseHeaders('application/xml');
    const response = await retryFetch(
      url,
      { method: 'POST', headers, body: eventoXml },
      this.config.retryConfig,
    );
    const body = await readBody(response);
    if (!response.ok) {
      throw new ESocialAPIError(
        `Falha ao enviar ${tipo}: HTTP ${response.status}`,
        response.status,
        body,
        response.status >= 500,
      );
    }
    // Resposta pode vir como JSON { protocolo } ou XML com <protocolo>
    const protocolo = extrairProtocolo(body);
    if (!protocolo) {
      throw new ESocialAPIError(
        `Resposta sem protocolo para ${tipo}`,
        response.status,
        body,
        false,
      );
    }
    return { protocolo };
  }

  /** Consulta status de um evento pelo protocolo retornado no envio. */
  async consultarEvento(protocolo: string): Promise<ConsultaEventoResposta> {
    if (!protocolo) throw new Error('consultarEvento: protocolo é obrigatório');
    const url = `${this.baseUrl}/eventos/${encodeURIComponent(protocolo)}`;
    const headers = this.baseHeaders('application/json');
    try {
      return await jsonFetch<ConsultaEventoResposta>(
        url,
        { method: 'GET', headers },
        this.config.retryConfig,
      );
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
        const e = err as { status: number; body: string; message?: string };
        throw new ESocialAPIError(
          `Falha ao consultar ${protocolo}: ${e.message ?? ''}`.trim(),
          e.status,
          e.body,
          e.status >= 500,
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new ESocialAPIError(
        `Falha ao consultar ${protocolo}: ${msg}`,
        0,
        '',
        true,
      );
    }
  }
}

/** Extrai o protocolo de uma resposta JSON ou XML. */
function extrairProtocolo(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { protocolo?: unknown };
      if (typeof parsed.protocolo === 'string' && parsed.protocolo) {
        return parsed.protocolo;
      }
    } catch {
      /* fallthrough */
    }
  }
  const m = trimmed.match(/<protocolo>([^<]+)<\/protocolo>/i);
  return m ? m[1].trim() : null;
}
