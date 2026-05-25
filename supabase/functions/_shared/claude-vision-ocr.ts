/**
 * Cliente Claude Vision OCR — Edge Functions
 *
 * Substitui Mistral OCR por Claude Vision (Anthropic API).
 * Usa o tipo de conteúdo `document` (PDF nativo) ou `image` (visão).
 *
 * Modelo default: `claude-sonnet-4-6` (melhor custo-benefício para OCR).
 *
 * Resiliência:
 *   - Retry exponencial com jitter para 429 e 5xx
 *   - Timeout configurável por chamada (default 120s)
 *   - AbortController para evitar requests penduradas
 */

const ANTHROPIC_API = "https://api.anthropic.com";

export interface ClaudeOcrOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export interface ClaudeOcrPage {
  index: number;
  markdown: string;
}

export interface ClaudeOcrResult {
  pages: ClaudeOcrPage[];
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  retries_used?: number;
  duration_ms?: number;
}

export class ClaudeOcrError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retriable: boolean = false,
  ) {
    super(message);
    this.name = "ClaudeOcrError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

const OCR_SYSTEM_PROMPT = `You are a precise document OCR system. Extract ALL text from the provided document exactly as it appears.

Rules:
- Output the text as clean markdown
- Preserve tables using markdown table syntax
- Preserve headers, lists, and formatting structure
- For each page, output a separator: --- PAGE N ---
- Do NOT add commentary, analysis, or interpretation
- Do NOT skip any text, even if it seems irrelevant
- Preserve numbers, dates, and values EXACTLY as they appear
- If text is illegible, write [ilegível]
- Output in the original language of the document`;

/**
 * Envia PDF ou imagem para Claude Vision e retorna texto OCR por página.
 */
export async function ocrBytes(
  bytes: Uint8Array,
  filename: string,
  opts: ClaudeOcrOptions,
): Promise<ClaudeOcrResult> {
  const {
    apiKey,
    model = "claude-sonnet-4-6",
    timeoutMs = 300_000,
    maxRetries = 4,
    retryBaseMs = 2000,
  } = opts;

  const base64 = uint8ToBase64(bytes);
  const isPdf = filename.toLowerCase().endsWith(".pdf") || bytes[0] === 0x25; // %PDF

  const content: unknown[] = [];
  if (isPdf) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    });
  } else {
    const mediaType = detectImageMime(filename);
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64,
      },
    });
  }
  content.push({
    type: "text",
    text: "Extract all text from this document as markdown. Use --- PAGE N --- separators between pages.",
  });

  const body = {
    model,
    max_tokens: 16384,
    system: OCR_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  };

  let lastErr: Error | null = null;
  const t0 = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetchWithTimeout(
        `${ANTHROPIC_API}/v1/messages`,
        {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        timeoutMs,
      );

      if (resp.ok) {
        const data = await resp.json();
        const textBlocks = (data.content || [])
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text);
        const fullText = textBlocks.join("\n");
        const pages = parsePages(fullText);

        if (attempt > 0) {
          console.log(
            `[claude-ocr] sucesso após ${attempt} retry(s) em ${Date.now() - t0}ms`,
          );
        }

        return {
          pages,
          model: (data.model as string) || model,
          usage: data.usage as ClaudeOcrResult["usage"],
          retries_used: attempt,
          duration_ms: Date.now() - t0,
        };
      }

      const txt = await resp.text();
      const retriable = resp.status === 429 || resp.status >= 500;
      lastErr = new ClaudeOcrError(
        `OCR falhou ${resp.status}: ${txt.slice(0, 300)}`,
        resp.status,
        retriable,
      );
      if (!retriable) throw lastErr;
      console.warn(
        `[claude-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (${resp.status}) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
      );
      await delay(backoffDelay(retryBaseMs, attempt));
    } catch (err) {
      if (err instanceof ClaudeOcrError && !err.retriable) throw err;
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[claude-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (network/timeout) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
      );
      await delay(backoffDelay(retryBaseMs, attempt));
    }
  }

  console.error(
    `[claude-ocr] esgotou ${maxRetries} retries em ${Date.now() - t0}ms — desistindo`,
  );
  throw lastErr ?? new ClaudeOcrError("OCR falhou sem erro reportado");
}

/**
 * OCR via URL (baixa o conteúdo e processa).
 */
export async function ocrFromUrl(
  url: string,
  filename: string,
  opts: ClaudeOcrOptions,
): Promise<ClaudeOcrResult> {
  const resp = await fetchWithTimeout(url, {}, opts.timeoutMs ?? 60_000);
  if (!resp.ok) throw new ClaudeOcrError(`Download falhou: ${resp.status}`, resp.status);
  const buffer = await resp.arrayBuffer();
  return ocrBytes(new Uint8Array(buffer), filename, opts);
}

function parsePages(text: string): ClaudeOcrPage[] {
  const pagePattern = /---\s*PAGE\s+(\d+)\s*---/gi;
  const parts = text.split(pagePattern);

  if (parts.length <= 1) {
    return [{ index: 0, markdown: text.trim() }];
  }

  const pages: ClaudeOcrPage[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10);
    const markdown = (parts[i + 1] || "").trim();
    pages.push({ index: pageNum - 1, markdown });
  }
  return pages;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function detectImageMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * Executa N tarefas OCR em paralelo respeitando um limite de concorrência.
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
