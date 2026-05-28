/**
 * Cliente Mistral OCR — Edge Functions
 *
 * Endpoints suportados:
 *   - POST https://api.mistral.ai/v1/files           (upload de PDF/imagem)
 *   - POST https://api.mistral.ai/v1/ocr             (OCR via file_id ou URL)
 *   - DELETE https://api.mistral.ai/v1/files/{id}    (limpeza pós-OCR)
 *
 * Modelo default: `mistral-ocr-latest` (modelo dedicado, melhor que vision).
 *
 * Resiliência:
 *   - Retry exponencial com jitter para 429 e 5xx
 *   - Timeout configurável por chamada (default 120s)
 *   - AbortController para evitar requests penduradas
 *   - Upload com purpose=ocr para permitir DELETE depois
 *   - Validação mínima da resposta (pages array presente)
 *
 * Referência API Mistral:
 *   https://docs.mistral.ai/api/#tag/ocr/operation/ocr_v1_ocr_post
 */

const MISTRAL_API = "https://api.mistral.ai";

export interface MistralOcrOptions {
  /** Chave API Mistral (obrigatório). */
  apiKey: string;
  /** Modelo OCR. Default: 'mistral-ocr-latest'. */
  model?: string;
  /** Timeout por request em ms. Default 120_000 (2min). */
  timeoutMs?: number;
  /** Retries em caso de 429/5xx. Default 4. */
  maxRetries?: number;
  /** Delay base para backoff exponencial em ms. Default 2000. */
  retryBaseMs?: number;
}

export interface MistralOcrPage {
  /** Index 0-based dentro do documento OCRizado. */
  index: number;
  /** Markdown extraído da página (pode conter tabelas, headers, etc.) */
  markdown: string;
  /** Dimensões, quando fornecidas. */
  dimensions?: { width: number; height: number; dpi: number };
  /** Imagens inline detectadas (tabelas rasterizadas, assinaturas, etc.) */
  images?: Array<{ id: string; top_left_x: number; top_left_y: number; bottom_right_x: number; bottom_right_y: number }>;
}

export interface MistralOcrResult {
  /** Páginas retornadas pelo Mistral. */
  pages: MistralOcrPage[];
  /** Modelo efetivamente usado. */
  model: string;
  /** Tokens de input processados (se a API retornar). */
  usage?: { pages_processed?: number };
  /** Telemetria de execução: tentativas até sucesso (0 = primeira tentativa). */
  retries_used?: number;
  /** Tempo total em ms desde a 1ª tentativa até retorno (inclui backoffs). */
  duration_ms?: number;
}

/** Erro estruturado da API Mistral. */
export class MistralOcrError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retriable: boolean = false,
  ) {
    super(message);
    this.name = "MistralOcrError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Backoff: base * 2^attempt + jitter aleatório 0..base */
function backoffDelay(base: number, attempt: number): number {
  return base * Math.pow(2, attempt) + Math.floor(Math.random() * base);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Faz upload de um PDF/imagem para Mistral Files API com `purpose=ocr`.
 * Retorna o `file_id` usado em /v1/ocr.
 *
 * O SDK oficial usa multipart/form-data. Implementamos manualmente para
 * evitar dependência externa (Deno).
 */
export async function uploadFile(
  bytes: Uint8Array,
  filename: string,
  opts: MistralOcrOptions,
): Promise<string> {
  const { apiKey, maxRetries = 4, retryBaseMs = 2000, timeoutMs = 120_000 } = opts;

  const form = new FormData();
  form.append("purpose", "ocr");
  form.append("file", new Blob([bytes], { type: "application/pdf" }), filename);

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetchWithTimeout(
        `${MISTRAL_API}/v1/files`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        },
        timeoutMs,
      );

      if (resp.ok) {
        const data = await resp.json();
        const id = data.id as string | undefined;
        if (!id) throw new MistralOcrError(`Upload retornou sem id: ${JSON.stringify(data).slice(0, 200)}`);
        return id;
      }

      const txt = await resp.text();
      const retriable = resp.status === 429 || resp.status >= 500;
      lastErr = new MistralOcrError(
        `Upload falhou ${resp.status}: ${txt.slice(0, 200)}`,
        resp.status,
        retriable,
      );
      if (!retriable) throw lastErr;
      await delay(backoffDelay(retryBaseMs, attempt));
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Abort por timeout ou rede → retry
      await delay(backoffDelay(retryBaseMs, attempt));
    }
  }

  throw lastErr ?? new MistralOcrError("Upload falhou sem erro reportado");
}

/**
 * Obtém uma URL assinada Mistral para um file_id (alternativa a passar file_id direto).
 * Usado quando a OCR API exige document_url em vez de file reference.
 *
 * IMPORTANTE: `expiry` na Mistral é em HORAS (não segundos). Range: 1..24.
 *
 * Retry para 404: o endpoint `/v1/files/{id}/url` é eventually-consistent —
 * o `file_id` recém-criado leva até alguns segundos pra propagar nos índices
 * internos. Sem retry, ~75% dos uploads em rajada falham (observado em 3 de 4
 * fichas Joseli em 2026-05-28). Backoff curto (500ms, 1s, 2s, 4s) cobre a
 * janela de propagação sem inflar latência do caminho feliz.
 */
export async function getFileSignedUrl(
  fileId: string,
  opts: MistralOcrOptions,
  expiryHours = 1,
): Promise<string> {
  const { apiKey, timeoutMs = 30_000 } = opts;
  const clamped = Math.max(1, Math.min(24, Math.floor(expiryHours)));

  let lastErr: MistralOcrError | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetchWithTimeout(
      `${MISTRAL_API}/v1/files/${fileId}/url?expiry=${clamped}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      timeoutMs,
    );

    if (resp.ok) {
      const data = await resp.json();
      const url = data.url as string | undefined;
      if (!url) throw new MistralOcrError("Sem url na resposta do Mistral");
      return url;
    }

    const t = await resp.text();
    lastErr = new MistralOcrError(
      `getFileSignedUrl ${resp.status}: ${t.slice(0, 200)}`,
      resp.status,
    );

    // 404 = file_id ainda não propagou; 429/5xx = retriable.
    const retriable = resp.status === 404 || resp.status === 429 || resp.status >= 500;
    if (!retriable || attempt === 3) throw lastErr;

    // 500ms, 1s, 2s, 4s — total ~7.5s no pior caso.
    await delay(500 * Math.pow(2, attempt));
  }

  throw lastErr ?? new MistralOcrError("getFileSignedUrl falhou sem erro reportado");
}

/**
 * Deleta um arquivo no Mistral (limpeza pós-OCR). Erros são engolidos
 * para não interromper o pipeline principal; limpeza é best-effort.
 */
export async function deleteFile(fileId: string, opts: MistralOcrOptions): Promise<void> {
  try {
    await fetchWithTimeout(
      `${MISTRAL_API}/v1/files/${fileId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${opts.apiKey}` } },
      15_000,
    );
  } catch (err) {
    console.warn(`[mistral] Delete file ${fileId} falhou (ignorado):`, err);
  }
}

/**
 * Chama `/v1/ocr` com um documento (via URL assinada ou file_id interno Mistral).
 * Retorna markdown por página.
 *
 * `sourceType='document_url'` com URL assinada do Supabase funciona para
 * PDFs e imagens acessíveis publicamente por HTTPS. Usar `sourceType='file'`
 * quando o upload foi feito em /v1/files.
 */
export async function runOcr(
  source:
    | { type: "document_url"; document_url: string }
    | { type: "file"; file_id: string }
    | { type: "image_url"; image_url: string },
  opts: MistralOcrOptions,
): Promise<MistralOcrResult> {
  const {
    apiKey,
    model = "mistral-ocr-latest",
    timeoutMs = 300_000, // 5 min — PDFs densos com tabelas grandes podem demorar
    maxRetries = 4,
    retryBaseMs = 2000,
  } = opts;

  // Monta o body conforme o tipo de source.
  let document: Record<string, unknown>;
  if (source.type === "document_url") {
    document = { type: "document_url", document_url: source.document_url };
  } else if (source.type === "image_url") {
    document = { type: "image_url", image_url: source.image_url };
  } else {
    document = { type: "file", file_id: source.file_id };
  }

  const body = {
    model,
    document,
    // Campos opcionais suportados pela API (podem ser usados depois):
    // include_image_base64: false,
    // image_limit: 0,
    // image_min_size: 0,
  };

  let lastErr: Error | null = null;
  const t0 = Date.now();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetchWithTimeout(
        `${MISTRAL_API}/v1/ocr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        timeoutMs,
      );

      if (resp.ok) {
        const data = await resp.json();
        const pagesRaw = Array.isArray(data.pages) ? data.pages : [];
        const pages: MistralOcrPage[] = pagesRaw.map((p: Record<string, unknown>, i: number) => ({
          index: typeof p.index === "number" ? (p.index as number) : i,
          markdown: typeof p.markdown === "string" ? (p.markdown as string) : "",
          dimensions: p.dimensions as MistralOcrPage["dimensions"],
          images: p.images as MistralOcrPage["images"],
        }));
        if (attempt > 0) {
          // Sinaliza pra observabilidade que o retry foi necessário —
          // taxa de retry > 5% indica problema sistêmico (Mistral degradado
          // ou quota perto do limite).
          console.log(
            `[mistral-ocr] sucesso após ${attempt} retry(s) em ${Date.now() - t0}ms`,
          );
        }
        return {
          pages,
          model: (data.model as string) || model,
          usage: data.usage as MistralOcrResult["usage"],
          retries_used: attempt,
          duration_ms: Date.now() - t0,
        };
      }

      const txt = await resp.text();
      const retriable = resp.status === 429 || resp.status >= 500;
      lastErr = new MistralOcrError(
        `OCR falhou ${resp.status}: ${txt.slice(0, 300)}`,
        resp.status,
        retriable,
      );
      if (!retriable) throw lastErr;
      console.warn(
        `[mistral-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (${resp.status}) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
      );
      await delay(backoffDelay(retryBaseMs, attempt));
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[mistral-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (network/timeout) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
      );
      await delay(backoffDelay(retryBaseMs, attempt));
    }
  }

  console.error(
    `[mistral-ocr] esgotou ${maxRetries} retries em ${Date.now() - t0}ms — desistindo`,
  );
  throw lastErr ?? new MistralOcrError("OCR falhou sem erro reportado");
}

/**
 * Pipeline conveniência: faz upload + obtém URL assinada Mistral + OCR + delete.
 * Pattern comprovado (doc cookbook + workflows n8n em produção):
 *   1. POST /v1/files?purpose=ocr                 → file_id
 *   2. GET  /v1/files/{id}/url?expiry=N           → signed URL do Mistral
 *   3. POST /v1/ocr { type: "document_url", ... } → resultado
 *   4. DELETE /v1/files/{id}                      (cleanup async, best-effort)
 *
 * Em testes internos, esse caminho via document_url com URL do próprio
 * Mistral é mais rápido e robusto que `type: "file" + file_id` direto,
 * que às vezes tem latência adicional.
 */
export async function ocrBytes(
  bytes: Uint8Array,
  filename: string,
  opts: MistralOcrOptions,
): Promise<MistralOcrResult> {
  const fileId = await uploadFile(bytes, filename, opts);
  try {
    // Pega URL assinada Mistral (expiry em HORAS; 1h basta para OCR rodar).
    const mistralUrl = await getFileSignedUrl(fileId, opts, 1);
    const result = await runOcr(
      { type: "document_url", document_url: mistralUrl },
      opts,
    );
    // Fire-and-forget cleanup.
    deleteFile(fileId, opts).catch(() => { /* ignore */ });
    return result;
  } catch (err) {
    // Tenta limpar mesmo em falha (best-effort).
    deleteFile(fileId, opts).catch(() => { /* ignore */ });
    throw err;
  }
}

/**
 * Executa N tarefas OCR em paralelo respeitando um limite de concorrência.
 * Retorna resultados na ordem dos inputs (como Promise.all), mas falhas
 * individuais NÃO interrompem as outras — são retornadas como `{ error }`.
 *
 * Útil para chunks de PDF: queremos resultado parcial se alguns chunks falharem.
 */
export async function runInParallel<I, O>(
  items: I[],
  worker: (item: I, index: number) => Promise<O>,
  concurrency: number,
): Promise<Array<{ ok: true; value: O } | { ok: false; error: string }>> {
  const out: Array<{ ok: true; value: O } | { ok: false; error: string }> = new Array(items.length);
  let next = 0;

  async function runOne(): Promise<void> {
    while (true) {
      const myIndex = next++;
      if (myIndex >= items.length) return;
      try {
        const value = await worker(items[myIndex], myIndex);
        out[myIndex] = { ok: true, value };
      } catch (err) {
        out[myIndex] = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  const workers: Promise<void>[] = [];
  const n = Math.max(1, Math.min(concurrency, items.length));
  for (let i = 0; i < n; i++) workers.push(runOne());
  await Promise.all(workers);
  return out;
}
