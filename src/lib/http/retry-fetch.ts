/**
 * retry-fetch — wrapper sobre `fetch` nativo com retry exponencial.
 *
 * Retenta apenas em erros de rede (TypeError do fetch) e respostas HTTP 5xx.
 * Respostas 4xx (erro do cliente) nunca são retentadas.
 *
 * Backoff: `baseDelayMs * 2^(tentativa)` (1s, 2s, 4s, 8s, ...).
 * Respeita `AbortSignal` — aborta imediatamente sem retentar.
 */

export interface RetryConfig {
  /** Número máximo de tentativas após a primeira (default 4). */
  maxRetries?: number;
  /** Delay base em ms (default 1000). */
  baseDelayMs?: number;
  /** Delay máximo em ms entre tentativas (default 30000). */
  maxDelayMs?: number;
  /**
   * Predicado custom para decidir se deve retentar.
   * Recebe o status HTTP (0 se network error) e o erro capturado.
   * Default: retenta em status 0 (network) ou 5xx.
   */
  retryOn?: (status: number, err: unknown) => boolean;
}

export interface ResolvedRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn: (status: number, err: unknown) => boolean;
}

const DEFAULT_RETRY_ON = (status: number, _err: unknown): boolean => {
  // status 0 → erro de rede. 5xx → erro do servidor.
  return status === 0 || (status >= 500 && status < 600);
};

export function resolveRetryConfig(cfg?: RetryConfig): ResolvedRetryConfig {
  return {
    maxRetries: cfg?.maxRetries ?? 4,
    baseDelayMs: cfg?.baseDelayMs ?? 1000,
    maxDelayMs: cfg?.maxDelayMs ?? 30000,
    retryOn: cfg?.retryOn ?? DEFAULT_RETRY_ON,
  };
}

/** Aguarda `ms` milissegundos, abortando se o signal for disparado. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

/**
 * `fetch` nativo com retry exponencial.
 * Lança a última resposta ou erro se todas as tentativas falharem.
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryConfig?: RetryConfig,
): Promise<Response> {
  const cfg = resolveRetryConfig(retryConfig);
  const signal = options.signal ?? undefined;
  let attempt = 0;
  let lastErr: unknown;
  let lastResponse: Response | undefined;

  while (attempt <= cfg.maxRetries) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // Resposta HTTP com status de erro — decide se retenta
      const shouldRetry =
        attempt < cfg.maxRetries && cfg.retryOn(response.status, undefined);
      if (!shouldRetry) return response;
      lastResponse = response;
    } catch (err) {
      if (isAbortError(err)) throw err;
      lastErr = err;
      const shouldRetry = attempt < cfg.maxRetries && cfg.retryOn(0, err);
      if (!shouldRetry) throw err;
    }
    // Backoff
    const delay = Math.min(
      cfg.baseDelayMs * Math.pow(2, attempt),
      cfg.maxDelayMs,
    );
    await sleep(delay, signal);
    attempt++;
  }

  // Se chegamos aqui é porque o loop terminou — retorna a última resposta
  // (se tivermos uma) ou lança o último erro capturado.
  if (lastResponse) return lastResponse;
  throw lastErr ?? new Error('retryFetch: esgotadas as tentativas');
}

/**
 * `fetch` que parseia JSON e lança em status HTTP de erro.
 * Útil para APIs REST que retornam JSON em sucesso e erro.
 */
export async function jsonFetch<T>(
  url: string,
  options: RequestInit = {},
  retryConfig?: RetryConfig,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await retryFetch(
    url,
    { ...options, headers },
    retryConfig,
  );
  const text = await response.text();
  if (!response.ok) {
    const err = new Error(
      `HTTP ${response.status} em ${url}: ${text.slice(0, 200)}`,
    ) as Error & { status: number; body: string };
    err.status = response.status;
    err.body = text;
    throw err;
  }
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Resposta inválida (não-JSON) em ${url}`);
  }
}
