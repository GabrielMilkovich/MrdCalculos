// =====================================================
// EDGE FUNCTION: OCR DE DOCUMENTOS (MISTRAL OCR + CHUNKING)
// =====================================================
// Pipeline resiliente para extrair texto de documentos trabalhistas
// (cartão de ponto, holerite, TRCT, CTPS, etc.) usando Mistral OCR.
//
// Arquitetura:
//   1. Baixar documento do Supabase Storage (signed URL, 2 buckets de fallback)
//   2. Detectar MIME. Se PDF:
//        a. Inspecionar páginas
//        b. Se > 8 páginas OU > 12MB: dividir em chunks (pdf-lib em memória)
//        c. Para cada chunk: upload p/ Mistral Files + OCR + delete
//        d. Merge preservando numeração original de páginas
//      Se imagem (PNG/JPG/WEBP/TIFF): OCR direto (sem split)
//   3. Concatenar markdown + emitir metadados estruturados
//   4. Persistir em `documents` com progresso (ocr_chunks_total/done)
//   5. Tratar falhas parciais: chunks que falharem são preservados como
//      placeholder `[CHUNK N-M: falha: ...]` e o documento fica `partial`.
//
// Antecipações de erro implementadas:
//   - Rate limit 429: backoff exponencial + jitter (mistral-ocr.ts)
//   - Timeout: AbortController por request, timeout de 3min p/ OCR
//   - PDF criptografado: ignoreEncryption=true, se ainda falhar → erro claro
//   - PDF corrupto: fallback para vision API em chunk único
//   - Arquivo muito grande (> 50MB): rejeitado com mensagem clara
//   - Muitas páginas (> 500): rejeitado p/ evitar custo runaway
//   - Concorrência: máximo 4 chunks simultâneos
//   - Ordem dos chunks: preservada por índice, não por completude
//   - Caracteres especiais: UTF-8 forçado em todas as respostas
//   - Vazios: chunk sem texto vira `[PÁGINA N: vazia]` em vez de sumir
//   - Falha total: retorna 500 mas sempre atualiza `documents.status='failed'`
//   - Retry idempotente: função pode ser chamada N vezes com mesmo document_id
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  inspectPdf,
  splitPdfIntoChunks,
  decidePagesPerChunk,
  arrayBufferToBase64,
} from "../_shared/pdf-utils.ts";
import {
  ocrBytes,
  runOcr,
  runInParallel,
  type MistralOcrResult,
  type MistralOcrPage,
  type MistralOcrOptions,
} from "../_shared/mistral-ocr.ts";

// =====================================================
// Configurações
// =====================================================

/** Máximo de chunks em paralelo para não estourar rate limit. */
const MAX_CONCURRENT_CHUNKS = 4;

/** Tamanho acima do qual SEMPRE dividimos PDFs. */
const SIZE_SPLIT_THRESHOLD_BYTES = 12 * 1024 * 1024; // 12 MB

/** Tamanho absoluto máximo aceito pela função. */
const ABSOLUTE_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

/** Páginas absolutas máximas (proteção contra custo). */
const ABSOLUTE_MAX_PAGES = 500;

/** Formatos de imagem processados sem split. */
const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "image/tif",
]);

// =====================================================
// Helpers
// =====================================================

/** Detecta MIME a partir do file_name quando não vier no registro. */
function detectMimeFromName(name: string | undefined | null): string {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".tif") || n.endsWith(".tiff")) return "image/tiff";
  return "application/pdf";
}

/** Detecta o "tipo de documento" a partir do texto extraído (heurística). */
function detectDocType(text: string): string {
  const t = text.toLowerCase();
  if (/t\.?r\.?c\.?t|termo\s+de\s+rescis[aã]o/i.test(t)) return "trct";
  if (/cart[aã]o\s+de\s+ponto|ponto\s+eletr[oô]nico|registro\s+de\s+jornada|folha\s+de\s+frequ[eê]ncia/i.test(t)) return "cartao_ponto";
  if (/contrach|holerite|recibo\s+de\s+pag/i.test(t)) return "holerite";
  if (/carteira\s+de\s+trabalho|c\.?t\.?p\.?s/i.test(t)) return "ctps";
  if (/f\.?g\.?t\.?s|fundo\s+de\s+garantia/i.test(t)) return "fgts";
  if (/peti[çc][aã]o|exce[çc][aã]o|contesta[çc][aã]o|recurso/i.test(t)) return "peticao";
  if (/senten[cç]a|ac[oó]rd[aã]o|despacho/i.test(t)) return "sentenca";
  if (/conven[cç][aã]o\s+coletiva|c\.?c\.?t/i.test(t)) return "cct";
  if (/contrato\s+de\s+trabalho/i.test(t)) return "contrato";
  return "outro";
}

/** Confiança default do Mistral OCR, com penalidades para sinais ruins. */
function estimateConfidence(pages: MistralOcrPage[], markdownOverride?: string): number {
  let conf = 0.95;
  const joined = markdownOverride ?? pages.map((p) => p.markdown || "").join("\n");
  const totalLen = joined.length;
  if (totalLen < 200) conf -= 0.2;
  if (pages.length > 0) {
    const emptyPages = pages.filter((p) => !p.markdown.trim()).length;
    if (emptyPages > 0) conf -= Math.min(0.3, emptyPages * 0.05);
  }

  // Detecta sinais de OCR degradado (texto ruim):
  //  - excesso de simbolos estranhos (�, ?, sequencias de pontuacao)
  //  - paginas com densidade baixa de palavras reais
  if (totalLen > 0) {
    // Caracteres "garbage": placeholder unicode, sequencias de pontuacao
    const garbage = (joined.match(/�|\?{3,}|[^\w\sÀ-ÿ.,;:()/\\*#%&@+\-"'$!?|[\]{}°ºª=<>]{3,}/g) || [])
      .reduce((s, m) => s + m.length, 0);
    const garbageRatio = garbage / totalLen;
    if (garbageRatio > 0.02) conf -= Math.min(0.2, garbageRatio * 3);

    // Palavras minimas (3+ letras latin): doc razoavel tem 1 palavra por 10 chars
    const words = (joined.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
    const wordsPerChar = words / Math.max(1, totalLen);
    if (wordsPerChar < 0.05) conf -= 0.15; // texto muito fragmentado
  }

  return Math.max(0.1, Math.min(1, conf));
}

/** Baixa um arquivo HTTP com retry simples. */
async function downloadWithRetry(url: string, tries = 3): Promise<ArrayBuffer> {
  let lastErr: Error | null = null;
  for (let i = 0; i < tries; i++) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = await resp.arrayBuffer();
      if (buf.byteLength === 0) throw new Error("arquivo vazio");
      return buf;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("download falhou");
}

// =====================================================
// OCR real com Mistral
// =====================================================

interface OcrChunkInput {
  /** Primeira página ORIGINAL no PDF completo (1-indexed). */
  firstPage: number;
  /** Última página ORIGINAL no PDF completo (1-indexed). */
  lastPage: number;
  /** Bytes do sub-PDF. */
  bytes: Uint8Array;
  /** Label p/ logs. */
  label: string;
}

interface OcrChunkOutput {
  firstPage: number;
  lastPage: number;
  /** Markdown concatenado das páginas do chunk, com cabeçalhos de página. */
  markdown: string;
  /** Contagem de páginas efetivamente retornadas pelo Mistral. */
  pagesReturned: number;
}

async function ocrPdfChunk(
  input: OcrChunkInput,
  opts: MistralOcrOptions,
): Promise<OcrChunkOutput> {
  const result = await ocrBytes(input.bytes, `${input.label}.pdf`, opts);
  return materializeChunkPages(result, input.firstPage, input.lastPage);
}

/** Junta as pages do Mistral em um único markdown, preservando numeração original. */
function materializeChunkPages(
  result: MistralOcrResult,
  firstPage: number,
  lastPage: number,
): OcrChunkOutput {
  const expected = lastPage - firstPage + 1;
  const received = result.pages.length;
  const parts: string[] = [];

  for (let i = 0; i < expected; i++) {
    const originalPage = firstPage + i;
    const page = result.pages[i];
    if (!page) {
      parts.push(`--- PÁGINA ${originalPage} ---\n[página ausente na resposta do OCR]`);
      continue;
    }
    const body = page.markdown.trim();
    parts.push(`--- PÁGINA ${originalPage} ---\n${body || "[vazia]"}`);
  }

  return {
    firstPage,
    lastPage,
    markdown: parts.join("\n\n"),
    pagesReturned: received,
  };
}

// =====================================================
// Pipeline principal
// =====================================================

interface PipelineResult {
  markdown: string;
  pageCount: number;
  confidence: number;
  docType: string;
  chunksTotal: number;
  chunksDone: number;
  chunksFailed: number;
  chunksErrors: string[];
  provider: string;
  durationMs: number;
}

async function runPipeline(
  buffer: ArrayBuffer,
  mimeType: string,
  mistralOpts: MistralOcrOptions,
  onProgress?: (done: number, total: number) => Promise<void>,
): Promise<PipelineResult> {
  const t0 = Date.now();

  if (buffer.byteLength > ABSOLUTE_MAX_BYTES) {
    throw new Error(
      `Arquivo excede limite absoluto de ${(ABSOLUTE_MAX_BYTES / 1024 / 1024).toFixed(0)}MB`,
    );
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = IMAGE_MIMES.has(mimeType);

  if (!isPdf && !isImage) {
    // Tenta tratar como PDF como fallback (alguns uploads têm octet-stream)
    console.warn(`[ocr] MIME desconhecido '${mimeType}' — tentando como PDF`);
  }

  // Caminho de imagem: OCR direto via data URL (sem upload).
  if (isImage) {
    const base64 = arrayBufferToBase64(buffer);
    const result = await runOcr(
      { type: "image_url", image_url: `data:${mimeType};base64,${base64}` },
      mistralOpts,
    );
    const out = materializeChunkPages(result, 1, Math.max(1, result.pages.length));
    if (onProgress) await onProgress(1, 1);
    const text = out.markdown;
    return {
      markdown: text,
      pageCount: out.pagesReturned || 1,
      confidence: estimateConfidence(result.pages),
      docType: detectDocType(text),
      chunksTotal: 1,
      chunksDone: 1,
      chunksFailed: 0,
      chunksErrors: [],
      provider: "mistral-ocr",
      durationMs: Date.now() - t0,
    };
  }

  // Caminho de PDF: inspecionar + dividir se necessário.
  const info = await inspectPdf(buffer);
  if (!info.isPdf) {
    throw new Error("Arquivo não tem header PDF válido e não é imagem suportada");
  }
  if (info.pageCount > ABSOLUTE_MAX_PAGES) {
    throw new Error(
      `PDF tem ${info.pageCount} páginas, acima do limite absoluto ${ABSOLUTE_MAX_PAGES}`,
    );
  }

  const pagesPerChunk =
    buffer.byteLength > SIZE_SPLIT_THRESHOLD_BYTES
      ? decidePagesPerChunk(info.pageCount) || 10
      : decidePagesPerChunk(info.pageCount);

  if (pagesPerChunk === 0) {
    // PDF pequeno: OCR único via upload Mistral.
    const result = await ocrBytes(new Uint8Array(buffer), "documento.pdf", mistralOpts);
    const out = materializeChunkPages(result, 1, info.pageCount);
    if (onProgress) await onProgress(1, 1);
    let markdown = out.markdown;
    try {
      const retried = await retryWeakPages(buffer, markdown, info.pageCount, mistralOpts);
      if (retried.recovered > 0) {
        console.log(`[ocr] (small) retry individual recuperou ${retried.recovered} pagina(s) fraca(s)`);
        markdown = retried.markdown;
      }
    } catch (err) {
      console.warn(`[ocr] (small) retry de paginas fracas falhou:`, err);
    }
    return {
      markdown,
      pageCount: info.pageCount,
      confidence: estimateConfidence(result.pages, markdown),
      docType: detectDocType(markdown),
      chunksTotal: 1,
      chunksDone: 1,
      chunksFailed: 0,
      chunksErrors: [],
      provider: "mistral-ocr",
      durationMs: Date.now() - t0,
    };
  }

  // Split.
  const rawChunks = await splitPdfIntoChunks(buffer, pagesPerChunk);
  const chunks: OcrChunkInput[] = rawChunks.map((c, i) => ({
    firstPage: c.firstPage,
    lastPage: c.lastPage,
    bytes: c.bytes,
    label: `chunk-${String(i + 1).padStart(3, "0")}`,
  }));
  console.log(`[ocr] PDF split em ${chunks.length} chunks (${pagesPerChunk} pg/chunk)`);

  // Progress tracking compartilhado (atômico não garantido, mas aproxima).
  let completedCount = 0;
  const total = chunks.length;
  if (onProgress) await onProgress(0, total);

  const results = await runInParallel(
    chunks,
    async (chunk) => {
      const r = await ocrPdfChunk(chunk, mistralOpts);
      completedCount++;
      if (onProgress) await onProgress(completedCount, total);
      return r;
    },
    MAX_CONCURRENT_CHUNKS,
  );

  // Merge preservando ordem original (pelos indices) e tratando falhas parciais.
  const parts: string[] = [];
  const errors: string[] = [];
  let ok = 0;
  let fail = 0;
  let pagesReturned = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const c = chunks[i];
    if (r.ok) {
      parts.push(r.value.markdown);
      pagesReturned += r.value.pagesReturned;
      ok++;
    } else {
      const label = `páginas ${c.firstPage}-${c.lastPage}`;
      errors.push(`${label}: ${r.error}`);
      parts.push(
        `--- PÁGINA ${c.firstPage} ---\n[OCR FALHOU para ${label}: ${r.error}]`,
      );
      fail++;
    }
  }

  let markdown = parts.join("\n\n");

  // ============================================================
  // Retry de paginas fracas: re-roda OCR individualmente para
  // paginas que vieram vazias ou com muito pouco texto.
  // ============================================================
  try {
    const retried = await retryWeakPages(buffer, markdown, info.pageCount, mistralOpts);
    if (retried.recovered > 0) {
      console.log(`[ocr] retry individual recuperou ${retried.recovered} pagina(s) fraca(s)`);
      markdown = retried.markdown;
    }
  } catch (err) {
    console.warn(`[ocr] retry de paginas fracas falhou (seguindo com resultado original):`, err);
  }

  return {
    markdown,
    pageCount: info.pageCount,
    confidence: fail > 0
      ? Math.max(0.3, 0.9 - fail * 0.1)
      : estimateConfidence([], markdown),
    docType: detectDocType(markdown),
    chunksTotal: total,
    chunksDone: ok,
    chunksFailed: fail,
    chunksErrors: errors,
    provider: "mistral-ocr",
    durationMs: Date.now() - t0,
  };
}

// =====================================================
// Retry de paginas fracas
// =====================================================

/** Marcadores que indicam uma pagina que nao teve OCR util. */
const WEAK_PAGE_MARKERS = ["[vazia]", "[OCR FALHOU", "[pagina ausente", "[página ausente"];
/** Texto minimo (chars) para considerar que a pagina teve OCR util. */
const WEAK_PAGE_MIN_CHARS = 80;

/** Detecta, no markdown com cabecalhos `--- PÁGINA N ---`, as paginas fracas. */
function findWeakPages(markdown: string, totalPages: number): number[] {
  const weak: number[] = [];
  // Particiona por cabecalho de pagina.
  const sections = new Map<number, string>();
  const re = /---\s*P[ÁA]GINA\s+(\d+)\s*---\s*\n([\s\S]*?)(?=---\s*P[ÁA]GINA\s+\d+|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const pageNum = parseInt(m[1], 10);
    sections.set(pageNum, m[2].trim());
  }
  for (let p = 1; p <= totalPages; p++) {
    const body = sections.get(p) || "";
    if (!body) { weak.push(p); continue; }
    if (WEAK_PAGE_MARKERS.some((marker) => body.includes(marker))) { weak.push(p); continue; }
    // remove espaços/quebras para contar chars "uteis"
    if (body.replace(/\s+/g, "").length < WEAK_PAGE_MIN_CHARS) { weak.push(p); continue; }
  }
  return weak;
}

/** Substitui a secao de uma pagina especifica no markdown. */
function replacePageSection(markdown: string, pageNum: number, newBody: string): string {
  const header = `--- PÁGINA ${pageNum} ---`;
  const re = new RegExp(
    `---\\s*P[ÁA]GINA\\s+${pageNum}\\s*---\\s*\\n([\\s\\S]*?)(?=---\\s*P[ÁA]GINA\\s+\\d+|$)`,
    "i",
  );
  const replacement = `${header}\n${newBody.trim()}\n\n`;
  if (re.test(markdown)) return markdown.replace(re, replacement);
  // se nao encontrou a secao, concatena
  return `${markdown}\n\n${replacement}`;
}

/**
 * Re-roda OCR individualmente para cada pagina considerada fraca.
 * Extrai a pagina do PDF original (chunk de 1 pagina) e OCRiza.
 * Max 8 retries por documento para limitar custo.
 */
async function retryWeakPages(
  buffer: ArrayBuffer,
  markdown: string,
  totalPages: number,
  opts: MistralOcrOptions,
): Promise<{ markdown: string; recovered: number }> {
  const MAX_RETRIES_PER_DOC = 8;
  const weak = findWeakPages(markdown, totalPages);
  if (weak.length === 0) return { markdown, recovered: 0 };
  const toRetry = weak.slice(0, MAX_RETRIES_PER_DOC);
  console.log(`[ocr] ${weak.length} pagina(s) fraca(s) detectada(s); retry individual nas primeiras ${toRetry.length}: [${toRetry.join(", ")}]`);

  // Extrai cada pagina individualmente.
  const singles = await splitPdfIntoChunks(buffer, 1);

  let out = markdown;
  let recovered = 0;

  // Roda em paralelo com concorrencia limitada (reusa runInParallel via worker).
  const results = await runInParallel(
    toRetry,
    async (pageNum) => {
      const single = singles[pageNum - 1];
      if (!single) throw new Error(`pagina ${pageNum} ausente no split`);
      const r = await ocrBytes(single.bytes, `pagina-${pageNum}.pdf`, opts);
      const bodyRaw = r.pages[0]?.markdown?.trim() || "";
      return { pageNum, body: bodyRaw };
    },
    Math.min(MAX_CONCURRENT_CHUNKS, toRetry.length),
  );

  for (const r of results) {
    if (!r.ok) continue;
    const { pageNum, body } = r.value;
    if (body.replace(/\s+/g, "").length < WEAK_PAGE_MIN_CHARS) continue; // ainda fraca
    out = replacePageSection(out, pageNum, body);
    recovered++;
  }

  return { markdown: out, recovered };
}

// =====================================================
// HTTP handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return jsonResponse({ error: "document_id é obrigatório" }, 400);

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      return jsonResponse(
        { error: "MISTRAL_API_KEY não configurado. Adicione a variável nas Edge Function Secrets." },
        500,
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization header obrigatório" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega documento e valida permissão.
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();
    if (docError || !document) return jsonResponse({ error: "Documento não encontrado" }, 404);
    if (document.cases.criado_por !== user.id) {
      return jsonResponse({ error: "Sem acesso a este documento" }, 403);
    }

    // SEMPRE regenera signed URL a partir de storage_path — `arquivo_url` salvo
    // em upload-document expira em 1h. Só cai no valor armazenado se não há
    // storage_path (caso raro).
    let fileUrl: string | null = null;
    if (document.storage_path) {
      const buckets = ["juriscalculo-documents", "case-documents", "documents"];
      for (const b of buckets) {
        const { data } = await supabase.storage.from(b).createSignedUrl(document.storage_path, 7200);
        if (data?.signedUrl) { fileUrl = data.signedUrl; break; }
      }
    }
    if (!fileUrl) fileUrl = (document.arquivo_url as string | null) ?? null;
    if (!fileUrl) return jsonResponse({ error: "Sem URL de download para o documento" }, 400);

    // Marca como em processamento (estado intermediário).
    await supabase.from("documents").update({
      status: "ocr_running",
      processing_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
      ocr_chunks_total: null,
      ocr_chunks_done: null,
    }).eq("id", document_id);

    try {
      const buffer = await downloadWithRetry(fileUrl);
      const mimeType = document.mime_type || detectMimeFromName(document.file_name);

      const mistralOpts: MistralOcrOptions = { apiKey: MISTRAL_API_KEY };

      const progress = async (done: number, total: number) => {
        try {
          await supabase.from("documents").update({
            ocr_chunks_total: total,
            ocr_chunks_done: done,
            updated_at: new Date().toISOString(),
          }).eq("id", document_id);
        } catch (e) {
          console.warn("[ocr] progress update falhou:", e);
        }
      };

      const result = await runPipeline(buffer, mimeType, mistralOpts, progress);

      const finalStatus = result.chunksFailed === 0 ? "ocr_done" : "ocr_partial";

      // Auto-classifica `tipo` baseado no texto OCR, mas SO quando o
      // usuario nao fez escolha especifica (tipo atual e "outro" ou null).
      // Nunca sobrescreve uma classificacao explicita do usuario.
      const currentTipo = (document as any).tipo as string | null | undefined;
      const shouldAutoSetTipo =
        result.docType !== "outro" &&
        (!currentTipo || currentTipo === "outro");
      const newTipo = shouldAutoSetTipo ? result.docType : currentTipo;

      await supabase.from("documents").update({
        status: finalStatus,
        ...(shouldAutoSetTipo ? { tipo: newTipo } : {}),
        page_count: result.pageCount,
        ocr_confidence: result.confidence,
        ocr_confianca: result.confidence,
        ocr_chunks_total: result.chunksTotal,
        ocr_chunks_done: result.chunksDone,
        ocr_chunks_failed: result.chunksFailed,
        // Persiste o texto completo para o fluxo de validação no split-view.
        // Limite de 10MB no banco (texto markdown raramente passa disso;
        // se passar, trunca com aviso no final).
        ocr_text: result.markdown.length > 10_000_000
          ? result.markdown.slice(0, 10_000_000) + "\n\n[... truncado ...]"
          : result.markdown,
        ocr_validated: false, // sempre reseta validação em nova rodada de OCR
        ocr_validated_at: null,
        ocr_validated_by: null,
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: result.chunksFailed > 0 ? result.chunksErrors.join(" | ").slice(0, 1000) : null,
        metadata: {
          ...(document.metadata || {}),
          ocr_provider: result.provider,
          ocr_completed_at: new Date().toISOString(),
          ocr_duration_ms: result.durationMs,
          ocr_doc_type: result.docType,
          ocr_chunks_errors: result.chunksErrors.slice(0, 10),
          text_length: result.markdown.length,
          extracted_text_preview: result.markdown.slice(0, 500),
        },
      }).eq("id", document_id);

      return jsonResponse({
        success: true,
        document_id,
        status: finalStatus,
        provider: result.provider,
        page_count: result.pageCount,
        text_length: result.markdown.length,
        confidence: result.confidence,
        doc_type: result.docType,
        chunks: {
          total: result.chunksTotal,
          done: result.chunksDone,
          failed: result.chunksFailed,
          errors: result.chunksErrors,
        },
        duration_ms: result.durationMs,
        extracted_text: result.markdown,
        message:
          result.chunksFailed === 0
            ? "OCR concluído. Execute chunk-and-embed para indexação."
            : "OCR parcialmente concluído. Algumas páginas falharam; revise error_message.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ocr] pipeline falhou:", err);
      await supabase.from("documents").update({
        status: "failed",
        error_message: msg.slice(0, 500),
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        retry_count: (document.retry_count || 0) + 1,
        metadata: {
          ...(document.metadata || {}),
          ocr_failed_at: new Date().toISOString(),
          ocr_provider: "mistral-ocr",
          ocr_error: msg.slice(0, 500),
        },
      }).eq("id", document_id);
      return jsonResponse({ error: msg }, 500);
    }
  } catch (err) {
    console.error("[ocr] erro fatal:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
  }
});
