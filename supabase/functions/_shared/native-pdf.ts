/**
 * Extrator de texto nativo de PDFs (sem OCR).
 *
 * Quando o PDF é "digital" (gerado por software, não scaneado),
 * ele já tem texto embebido no stream de objetos — não precisa OCR.
 * Extração nativa é:
 *   - 100% precisa (nenhum erro de reconhecimento)
 *   - instantânea (~50ms vs ~10s do OCR)
 *   - gratuita (zero call ao Mistral)
 *
 * Usa `unpdf` (port leve do pdfjs-dist para runtimes serverless/Deno).
 *
 * Heuristica de qualidade:
 *   - "good": >= 500 chars úteis E >= 0.05 palavras/char
 *   - "poor": menos que isso → precisa OCR
 */

import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

export interface NativeExtractionResult {
  /** Texto extraído completo (concatenação das páginas com cabeçalhos). */
  text: string;
  /** Array por página (mesma indexação que o PDF, 0-based). */
  pages: string[];
  /** Quantas páginas o PDF tem. */
  pageCount: number;
  /** Qualidade avaliada: "good" = pode pular OCR; "poor" = precisa OCR. */
  quality: "good" | "poor" | "none";
  /** Detalhes pra log. */
  reason: string;
}

/** Texto util por pagina (chars nao-whitespace). */
function usefulCharsCount(s: string): number {
  return s.replace(/\s+/g, "").length;
}

/** Palavras "reais" (3+ letras latin). */
function realWordCount(s: string): number {
  return (s.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
}

/**
 * Extrai texto do PDF de forma nativa (sem OCR) quando possivel.
 * Retorna `quality: "poor"` se o texto extraido é tao pouco/ruim
 * que vale mais rodar OCR.
 */
export async function extractNativeText(
  bytes: Uint8Array,
): Promise<NativeExtractionResult> {
  let doc;
  try {
    // unpdf aceita Uint8Array direto.
    doc = await getDocumentProxy(bytes);
  } catch (err) {
    return {
      text: "",
      pages: [],
      pageCount: 0,
      quality: "none",
      reason: `getDocumentProxy falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const pageCount = doc.numPages;
  if (pageCount === 0) {
    return { text: "", pages: [], pageCount: 0, quality: "none", reason: "PDF sem paginas" };
  }

  let pages: string[] = [];
  try {
    // `extractText` retorna { text: string, totalPages: number } ou arrays por pagina.
    // Usamos mergePages=false para manter separado por pagina.
    const result = await extractText(doc, { mergePages: false });
    // result.text pode ser string[] (uma por pagina) ou string dependendo da versao.
    if (Array.isArray(result.text)) {
      pages = result.text as string[];
    } else if (typeof result.text === "string") {
      pages = [result.text];
    }
  } catch (err) {
    return {
      text: "",
      pages: [],
      pageCount,
      quality: "none",
      reason: `extractText falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Normaliza tamanho do array de paginas ao pageCount
  while (pages.length < pageCount) pages.push("");

  // Qualidade por pagina
  const totalUseful = pages.reduce((s, p) => s + usefulCharsCount(p), 0);
  const totalWords = pages.reduce((s, p) => s + realWordCount(p), 0);
  const joined = pages.join(" ");
  const totalChars = joined.length;
  const wordsPerChar = totalChars > 0 ? totalWords / totalChars : 0;

  // Monta texto final com cabeçalhos (compativel com o formato que o OCR produz)
  const parts: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const body = (pages[i] || "").trim();
    parts.push(`--- PÁGINA ${i + 1} ---\n${body || "[vazia]"}`);
  }
  const text = parts.join("\n\n");

  // Classificação de qualidade:
  //  - zero texto util → quality "none" (PDF totalmente escaneado)
  //  - pouco texto util ou densidade ruim de palavras → "poor" (precisa OCR)
  //  - senão → "good"
  if (totalUseful < 50) {
    return {
      text,
      pages,
      pageCount,
      quality: "none",
      reason: `apenas ${totalUseful} chars uteis no PDF inteiro (provavelmente escaneado)`,
    };
  }
  if (totalUseful < 500 || wordsPerChar < 0.05) {
    return {
      text,
      pages,
      pageCount,
      quality: "poor",
      reason: `${totalUseful} chars uteis, ${totalWords} palavras, ${wordsPerChar.toFixed(3)} palavras/char`,
    };
  }

  return {
    text,
    pages,
    pageCount,
    quality: "good",
    reason: `${totalUseful} chars uteis, ${totalWords} palavras em ${pageCount} pg`,
  };
}
