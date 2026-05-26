// =====================================================
// claude-vision-ocr.ts — OCR via Claude Vision (Anthropic API)
// =====================================================
// Substitui Mistral OCR mantendo signature pública compatível.
//
// Motivação: Mistral OCR estava retornando texto sujo em Fichas Financeiras
// densas (códigos 0501→0001, denominações DSR→CEP, dígitos confundidos
// 5↔3, 9↔0). Diagnosticado em sessão 2026-05-26 contra Ficha Financeira
// 2016 do ROQUE GUERREIRO TEIXEIRA (Via Varejo). Claude Vision com PDF
// nativo lê com fidelidade muito maior em layouts fixed-width.
//
// Migração anterior (commit ad8e498) foi revertida (4317a74) por 2 bugs:
//   1. model name "claude-sonnet-4-6-20250514" — não existe (canônico: "claude-sonnet-4-6")
//   2. faltava header "anthropic-beta: pdfs-2024-09-25" exigido pra PDF
// Ambos corrigidos aqui.
//
// API pública (compatível com mistral-ocr.ts):
//   - ocrBytes(bytes, filename, opts): Promise<OcrResult>
//   - runOcr(source, opts): Promise<OcrResult>
//   - runInParallel(inputs, fn, concurrency): bulk runner
//   - Tipos re-exportados como MistralOcr* pra zero-churn em call sites
// =====================================================

const ANTHROPIC_API = "https://api.anthropic.com";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const PDF_BETA_HEADER = "pdfs-2024-09-25";

export interface ClaudeOcrOptions {
  /** Chave API Anthropic (obrigatório). */
  apiKey: string;
  /** Modelo. Default: 'claude-sonnet-4-6'. */
  model?: string;
  /** Timeout por request em ms. Default 180_000 (3min) — PDFs grandes podem demorar. */
  timeoutMs?: number;
  /** Retries em caso de 429/529/5xx. Default 4. */
  maxRetries?: number;
  /** Delay base para backoff exponencial em ms. Default 2000. */
  retryBaseMs?: number;
}

export interface ClaudeOcrPage {
  /** Index 0-based dentro do documento OCRizado. */
  index: number;
  /** Markdown extraído da página. */
  markdown: string;
}

export interface ClaudeOcrResult {
  /** Páginas extraídas. */
  pages: ClaudeOcrPage[];
  /** Modelo efetivamente usado (vem da resposta da API). */
  model: string;
  /** Tokens usados. */
  usage?: { input_tokens?: number; output_tokens?: number };
  /** Telemetria: número de retries até sucesso (0 = primeira tentativa). */
  retries_used?: number;
  /** Tempo total em ms desde 1ª tentativa até retorno (inclui backoffs). */
  duration_ms?: number;
}

// Aliases pra compat com call sites que importavam de mistral-ocr.ts
// Permite trocar import path sem renomear identificadores.
export type MistralOcrOptions = ClaudeOcrOptions;
export type MistralOcrPage = ClaudeOcrPage;
export type MistralOcrResult = ClaudeOcrResult;

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
export const MistralOcrError = ClaudeOcrError;

// =====================================================
// Prompt OCR — agressivamente literal, sem interpretação.
// =====================================================
const OCR_SYSTEM_PROMPT = `You are a precise document OCR system for Brazilian labor-law documents (fichas financeiras, holerites, CTPS, cartões ponto). Extract ALL text EXACTLY as it appears.

RULES (strict):
- Output clean markdown.
- For tables, preserve column alignment using markdown table syntax with | separators OR preserve original fixed-width spacing — pick whichever the source uses.
- For each page of a multi-page PDF, output the literal separator on its own line: --- PAGE N --- where N is the 1-based page number.
- Preserve numbers, dates, currency values EXACTLY (every digit, every decimal, every separator). Brazilian format: thousand=. decimal=,
- Preserve header structure, line ordering, and column ordering.
- Do NOT add commentary, headers, explanations, or summaries.
- Do NOT translate, paraphrase, or "fix" anything.
- Do NOT skip text even if it seems boilerplate (CNPJ, datas, rodapés legais).
- If text is genuinely illegible, write [ilegível] in place — but try hard first.
- Output in the original language (Portuguese expected).

CRITICAL for fichas financeiras (ADP layout):
- Codes are 4-digit numerals (e.g. 0040, 0501, 0620, 3290). Read the FIRST digit carefully — 0 vs 5 vs 3 confusion is the #1 OCR error.
- Classification column has values: PGTO, DESC, BASE, ENCAR, OUTRO, PROV, INFO. Read EXACTLY.
- Denominations use Brazilian abbreviations: "DSR", "13Sal", "1/3 Adic Const Fer", "Insuf Saldo", "Adiant", "Quinzenal". Don't expand or correct.`;

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

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function detectMimeFromBytes(bytes: Uint8Array, filename: string): string {
  // PDF magic: %PDF (0x25 0x50 0x44 0x46)
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  // PNG magic: 89 50 4E 47
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }
  // JPEG magic: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  // Fallback por extensão
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/pdf"; // default conservador
}

function parsePages(text: string): ClaudeOcrPage[] {
  // Aceita variações: "--- PAGE 1 ---", "---PAGE 1---", "--- PAGINA 1 ---"
  const pagePattern = /---\s*(?:PAGE|PAGINA|PÁGINA)\s+(\d+)\s*---/gi;
  const parts = text.split(pagePattern);

  if (parts.length <= 1) {
    // Sem separadores; trata todo o texto como página única (index 0)
    return [{ index: 0, markdown: text.trim() }];
  }

  // parts: [pre-first-separator, '1', content1, '2', content2, ...]
  // Descarta o pre-first (geralmente vazio ou só whitespace)
  const pages: ClaudeOcrPage[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10);
    const markdown = (parts[i + 1] || "").trim();
    if (markdown) {
      // Index 0-based pra compat com mistral-ocr
      pages.push({ index: pageNum - 1, markdown });
    }
  }
  return pages.length > 0 ? pages : [{ index: 0, markdown: text.trim() }];
}

// =====================================================
// API pública
// =====================================================

/**
 * OCR via Claude Vision. Aceita PDF nativo (até ~100 páginas, ~32MB) ou imagem.
 * Mesma signature que mistralOcr.ocrBytes pra drop-in replacement.
 */
export async function ocrBytes(
  bytes: Uint8Array,
  filename: string,
  opts: ClaudeOcrOptions,
): Promise<ClaudeOcrResult> {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    timeoutMs = 180_000,
    maxRetries = 4,
    retryBaseMs = 2000,
  } = opts;

  if (!apiKey) {
    throw new ClaudeOcrError("apiKey obrigatório (ANTHROPIC_API_KEY)", undefined, false);
  }
  if (bytes.length === 0) {
    throw new ClaudeOcrError("bytes vazio", undefined, false);
  }

  const mimeType = detectMimeFromBytes(bytes, filename);
  const isPdf = mimeType === "application/pdf";
  const base64 = uint8ToBase64(bytes);

  const userContent: Array<Record<string, unknown>> = [];
  if (isPdf) {
    userContent.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    });
  } else {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    });
  }
  userContent.push({
    type: "text",
    text:
      isPdf
        ? "Extract all text from this PDF as markdown. Use the separator '--- PAGE N ---' between pages (N = 1-based page number). Preserve tables, numbers, and column alignment EXACTLY."
        : "Extract all text from this image as markdown. Preserve tables, numbers, and formatting EXACTLY.",
  });

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
  if (isPdf) {
    // OBRIGATÓRIO pra PDF — sem isso, retorna 4xx. Esquecer esse header foi
    // um dos motivos do revert anterior (commit 4317a74).
    headers["anthropic-beta"] = PDF_BETA_HEADER;
  }

  const body = {
    model,
    max_tokens: 16384,
    system: OCR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  };

  let lastErr: Error | null = null;
  const t0 = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetchWithTimeout(
        `${ANTHROPIC_API}/v1/messages`,
        { method: "POST", headers, body: JSON.stringify(body) },
        timeoutMs,
      );

      if (resp.ok) {
        const data = await resp.json() as {
          content?: Array<{ type: string; text?: string }>;
          model?: string;
          usage?: { input_tokens?: number; output_tokens?: number };
        };
        const textBlocks = (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text || "");
        const fullText = textBlocks.join("\n");

        if (fullText.length < 20) {
          // Resposta vazia/curta é suspeita — provavelmente Claude refusou ou retornou erro silencioso
          lastErr = new ClaudeOcrError(
            `OCR retornou pouco texto (${fullText.length} chars). Conteúdo: "${fullText.slice(0, 100)}"`,
            undefined,
            true, // retriable — pode ser flake
          );
          if (attempt < maxRetries - 1) {
            console.warn(`[claude-ocr] resposta curta na tentativa ${attempt + 1} — retry`);
            await delay(backoffDelay(retryBaseMs, attempt));
            continue;
          }
          throw lastErr;
        }

        const pages = parsePages(fullText);

        if (attempt > 0) {
          console.log(`[claude-ocr] sucesso após ${attempt} retry(s) em ${Date.now() - t0}ms — ${pages.length} págs`);
        }

        return {
          pages,
          model: data.model || model,
          usage: data.usage,
          retries_used: attempt,
          duration_ms: Date.now() - t0,
        };
      }

      // Resposta não-OK: decide se vale retry
      const txt = await resp.text();
      const retriable = resp.status === 429 || resp.status === 529 || resp.status >= 500;
      lastErr = new ClaudeOcrError(
        `OCR falhou ${resp.status}: ${txt.slice(0, 400)}`,
        resp.status,
        retriable,
      );
      if (!retriable) {
        // Erro permanente (400/401/403/404). Não retry.
        console.error(`[claude-ocr] erro permanente ${resp.status} — desistindo`);
        throw lastErr;
      }
      console.warn(
        `[claude-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (${resp.status}) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
      );
      await delay(backoffDelay(retryBaseMs, attempt));
    } catch (err) {
      if (err instanceof ClaudeOcrError && !err.retriable) throw err;
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        console.warn(
          `[claude-ocr] tentativa ${attempt + 1}/${maxRetries} falhou (network/timeout: ${lastErr.message}) — retry em ${backoffDelay(retryBaseMs, attempt)}ms`,
        );
        await delay(backoffDelay(retryBaseMs, attempt));
      }
    }
  }

  console.error(`[claude-ocr] esgotou ${maxRetries} retries em ${Date.now() - t0}ms`);
  throw lastErr ?? new ClaudeOcrError("OCR falhou sem erro reportado");
}

/**
 * Compat com call sites do ocr-document que usavam runOcr direto.
 * Aceita { type: 'image_url', image_url: 'data:...' } ou
 *        { type: 'document_url', document_url: 'data:...' | 'https://...' }
 */
export async function runOcr(
  source:
    | { type: "image_url"; image_url: string }
    | { type: "document_url"; document_url: string },
  opts: ClaudeOcrOptions,
): Promise<ClaudeOcrResult> {
  if (source.type === "image_url") {
    const m = source.image_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) {
      throw new ClaudeOcrError(
        "runOcr image_url precisa ser data URL base64 (data:image/...;base64,...)",
        undefined,
        false,
      );
    }
    const mediaType = m[1];
    const bytes = base64ToUint8(m[2]);
    const ext = (mediaType.split("/")[1] || "jpg").split(";")[0];
    return ocrBytes(bytes, `image.${ext}`, opts);
  }

  // document_url — data URL ou HTTP URL
  if (source.document_url.startsWith("data:")) {
    const m = source.document_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new ClaudeOcrError("data URL inválido", undefined, false);
    const bytes = base64ToUint8(m[2]);
    return ocrBytes(bytes, "document.pdf", opts);
  }

  // HTTP(s) URL — baixa e processa como bytes
  const resp = await fetchWithTimeout(source.document_url, {}, opts.timeoutMs ?? 60_000);
  if (!resp.ok) {
    throw new ClaudeOcrError(
      `Download falhou: ${resp.status}`,
      resp.status,
      resp.status >= 500,
    );
  }
  const buffer = await resp.arrayBuffer();
  return ocrBytes(new Uint8Array(buffer), "document.pdf", opts);
}

/**
 * Executa N tarefas OCR em paralelo respeitando um limite de concorrência.
 * Falhas individuais NÃO interrompem as outras — retornadas como { ok: false, error }.
 * Mesma signature de mistralOcr.runInParallel.
 */
export async function runInParallel<I, O>(
  inputs: I[],
  fn: (input: I) => Promise<O>,
  concurrency: number = 3,
): Promise<Array<{ ok: true; value: O } | { ok: false; error: Error }>> {
  const results: Array<{ ok: true; value: O } | { ok: false; error: Error }> = new Array(inputs.length);
  let index = 0;

  async function worker() {
    while (true) {
      const myIndex = index++;
      if (myIndex >= inputs.length) break;
      try {
        const value = await fn(inputs[myIndex]);
        results[myIndex] = { ok: true, value };
      } catch (err) {
        results[myIndex] = { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), inputs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
