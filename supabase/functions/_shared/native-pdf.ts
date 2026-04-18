/**
 * Extrator de texto nativo de PDFs (sem OCR e sem dependências externas).
 *
 * Quando o PDF é "digital" (gerado por software, não scaneado), ele já tem
 * texto embebido nos streams de objetos. Esta função faz parsing regex-based
 * do stream `BT ... ET` (text objects) e dos operadores Tj/TJ, sem precisar
 * de pdfjs/unpdf/canvas — roda no Deno runtime do Supabase sem boot-error.
 *
 * Limitações conhecidas (aceitáveis no trade-off):
 *  - Não extrai texto de streams comprimidos com Flate (pega só os uncompressed)
 *  - Não mapeia texto por página (retorna texto completo concatenado)
 *  - Não decodifica encodings complexos (CMap); o texto vem como está no PDF
 *
 * Se o PDF NÃO for digital (escaneado), retorna quality="none" e o pipeline
 * cai pro OCR Mistral.
 */

export interface NativeExtractionResult {
  /** Texto extraído completo (concatenação das páginas com cabeçalhos). */
  text: string;
  /** Array por página — vazio nesta impl. (sem mapeamento por página). */
  pages: string[];
  /** Quantas páginas o PDF tem (detectado via /Type /Page). */
  pageCount: number;
  /** Qualidade: "good" = pode pular OCR; "poor" = precisa OCR; "none" = scan. */
  quality: "good" | "poor" | "none";
  /** Detalhes pra log. */
  reason: string;
}

/** Palavras "reais" (3+ letras latin). */
function realWordCount(s: string): number {
  return (s.match(/[A-Za-zÀ-ÿ]{3,}/g) || []).length;
}

/**
 * Extrai texto do PDF via parsing regex do stream.
 * NÃO usa dependências externas — só TextDecoder builtin.
 */
export async function extractNativeText(
  bytes: Uint8Array,
): Promise<NativeExtractionResult> {
  try {
    const pdfStr = new TextDecoder("latin1").decode(bytes);

    // Detecta páginas via marcador /Type /Page (não /Pages)
    const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g) || [];
    const pageCount = Math.max(pageMatches.length, 1);

    const textObjects: string[] = [];

    // BT/ET são marcadores de "text object" no PDF
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match: RegExpExecArray | null;
    while ((match = btEtRegex.exec(pdfStr)) !== null) {
      const block = match[1];

      // Tj = show string; TJ = show array of strings
      const tjMatches = block.match(/\(((?:\\.|[^)])*)\)\s*Tj/g) || [];
      const tjArrMatches = block.match(/\[((?:\\.|[^\]])*)\]\s*TJ/gi) || [];

      for (const tj of tjMatches) {
        const m = tj.match(/\(((?:\\.|[^)])*)\)/);
        if (m) textObjects.push(decodePdfString(m[1]));
      }
      for (const tjArr of tjArrMatches) {
        const inner = tjArr.match(/\(((?:\\.|[^)])*)\)/g) || [];
        for (const it of inner) {
          const m = it.match(/\(((?:\\.|[^)])*)\)/);
          if (m) textObjects.push(decodePdfString(m[1]));
        }
      }
    }

    // Também tenta pegar strings de streams uncompressed (fallback)
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    while ((streamMatch = streamRegex.exec(pdfStr)) !== null) {
      const content = streamMatch[1];
      // só streams pequenos e sem indicador de compressão Flate
      if (content.length < 50_000 && !/^\x78[\x01\x5e\x9c\xda]/.test(content)) {
        const strings = content.match(/\(((?:\\.|[^)]){2,})\)/g) || [];
        for (const s of strings) {
          const m = s.match(/\(((?:\\.|[^)])+)\)/);
          if (m && /[A-Za-zÀ-ÿ]/.test(m[1])) textObjects.push(decodePdfString(m[1]));
        }
      }
    }

    const text = textObjects.join(" ").replace(/\s+/g, " ").trim();
    const usefulChars = text.replace(/\s+/g, "").length;
    const words = realWordCount(text);
    const wordsPerChar = text.length > 0 ? words / text.length : 0;

    // Palavras-chave comuns de documentos trabalhistas brasileiros
    const laborKeywords = [
      "salário", "salario", "admissão", "admissao", "demissão", "demissao",
      "CTPS", "FGTS", "INSS", "remuneração", "remuneracao", "férias", "ferias",
      "contrato", "empregado", "empregador", "CLT", "rescisão", "rescisao",
      "competência", "competencia", "processo", "reclamante", "reclamada",
      "holerite", "contracheque", "trct", "cartão", "ponto",
    ];
    const hasLaborContent = laborKeywords.some((kw) =>
      text.toLowerCase().includes(kw.toLowerCase())
    );

    const hasGoodText = usefulChars >= 500 && words >= 30 && wordsPerChar >= 0.04;

    // Constrói texto final com um cabeçalho unico (sem paginas individuais)
    const finalText = text
      ? `--- PÁGINA 1 ---\n${text}`
      : "";

    if (usefulChars < 50) {
      return {
        text: "",
        pages: [],
        pageCount,
        quality: "none",
        reason: `apenas ${usefulChars} chars uteis (PDF provavelmente escaneado)`,
      };
    }

    if (hasGoodText && hasLaborContent) {
      return {
        text: finalText,
        pages: [],
        pageCount,
        quality: "good",
        reason: `${usefulChars} chars, ${words} palavras, keywords trabalhistas detectadas`,
      };
    }

    if (hasGoodText) {
      return {
        text: finalText,
        pages: [],
        pageCount,
        quality: "good",
        reason: `${usefulChars} chars, ${words} palavras (sem keywords especificas)`,
      };
    }

    return {
      text: finalText,
      pages: [],
      pageCount,
      quality: "poor",
      reason: `${usefulChars} chars uteis, ${words} palavras, ratio=${wordsPerChar.toFixed(3)}`,
    };
  } catch (err) {
    return {
      text: "",
      pages: [],
      pageCount: 0,
      quality: "none",
      reason: `extracao falhou: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Decodifica strings PDF (escapes basicos). Não lida com CMap / encodings
 * complexos — mas cobre a maioria dos PDFs digitais em português.
 */
function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    // Octal escapes \ddd
    .replace(/\\([0-7]{1,3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)));
}
