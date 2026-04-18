/**
 * Utilitários de manipulação de PDF para Edge Functions
 *
 * - Contagem de páginas de um PDF (ArrayBuffer)
 * - Divisão de um PDF em vários PDFs menores (N páginas por chunk)
 * - Detecção de criptografia/proteção por senha
 *
 * Usa pdf-lib (pure JS, funciona em Deno). Processa em memória.
 */

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

export interface PdfChunk {
  /** 1-indexed: primeira página original deste chunk */
  firstPage: number;
  /** 1-indexed: última página original deste chunk (inclusive) */
  lastPage: number;
  /** Bytes do PDF com apenas as páginas [firstPage..lastPage] */
  bytes: Uint8Array;
}

export interface PdfInfo {
  pageCount: number;
  isEncrypted: boolean;
  /** Primeiros bytes reconhecidos como header PDF? */
  isPdf: boolean;
  /** Tamanho total em bytes */
  sizeBytes: number;
}

/**
 * Inspeciona um PDF (ArrayBuffer) e retorna informações básicas.
 * Não carrega o documento inteiro quando possível, é tolerante a erros.
 */
export async function inspectPdf(buffer: ArrayBuffer): Promise<PdfInfo> {
  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  const isPdf = header === "%PDF-";

  if (!isPdf) {
    return { pageCount: 0, isEncrypted: false, isPdf: false, sizeBytes: bytes.byteLength };
  }

  // pdf-lib joga se o PDF é encrypted E a flag `ignoreEncryption` está false.
  // Tentamos carregar com ignoreEncryption=true para conseguir contar páginas
  // mesmo em PDFs protegidos (muitos do judiciário têm DRM fraco).
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return {
      pageCount: doc.getPageCount(),
      isEncrypted: doc.isEncrypted,
      isPdf: true,
      sizeBytes: bytes.byteLength,
    };
  } catch (err) {
    // Tentar sem ignorar e pegar flag
    try {
      const doc = await PDFDocument.load(buffer);
      return {
        pageCount: doc.getPageCount(),
        isEncrypted: doc.isEncrypted,
        isPdf: true,
        sizeBytes: bytes.byteLength,
      };
    } catch {
      // Completamente corrupto
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Falha ao abrir PDF: ${msg}`);
    }
  }
}

/**
 * Divide um PDF em N chunks de `pagesPerChunk` páginas cada.
 *
 * Garante:
 * - Cada chunk é um PDF válido independente.
 * - Ordem preservada (chunk[i].firstPage < chunk[i+1].firstPage).
 * - Numeração original é rastreada em `firstPage`/`lastPage`.
 * - Último chunk pode ter menos páginas que `pagesPerChunk`.
 *
 * Se o PDF tem ≤ `pagesPerChunk` páginas, retorna uma lista com 1 elemento
 * (não precisa dividir).
 */
export async function splitPdfIntoChunks(
  buffer: ArrayBuffer,
  pagesPerChunk: number,
): Promise<PdfChunk[]> {
  if (pagesPerChunk < 1) throw new Error("pagesPerChunk deve ser >= 1");

  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = src.getPageCount();

  if (total === 0) throw new Error("PDF sem páginas");

  const chunks: PdfChunk[] = [];
  for (let start = 0; start < total; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, total);
    const chunkDoc = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await chunkDoc.copyPages(src, indices);
    for (const page of copied) chunkDoc.addPage(page);
    const outBytes = await chunkDoc.save({
      // Deflate é default; useObjectStreams=false reduz um pouco o overhead
      // em PDFs pequenos mas aumenta compatibilidade com parsers server-side.
      useObjectStreams: false,
    });
    chunks.push({
      firstPage: start + 1,
      lastPage: end,
      bytes: outBytes,
    });
  }

  return chunks;
}

/**
 * Decide o número ideal de páginas por chunk com base em heurísticas.
 *
 * Chunks menores = qualidade melhor em PDFs densos (tabelas, cartões
 * de ponto) e menos risco de truncamento na resposta do Mistral.
 * O tradeoff é mais chamadas à API, mas rodamos em paralelo (4x).
 *
 * - PDFs pequenos (≤ 6 pg): 1 chunk só (sem split).
 * - PDFs médios (7-30 pg): chunks de 5 páginas.
 * - PDFs grandes (> 30 pg): chunks de 6 páginas.
 *
 * Retorna 0 quando o PDF é pequeno e NÃO precisa split.
 */
export function decidePagesPerChunk(pageCount: number): number {
  if (pageCount <= 6) return 0; // sem split
  if (pageCount <= 30) return 5;
  return 6;
}

/**
 * Helpers para lidar com bytes ↔ base64 de forma segura em chunks grandes,
 * evitando stack overflow em `String.fromCharCode(...array)` com arrays grandes.
 */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return uint8ToBase64(new Uint8Array(buffer));
}
