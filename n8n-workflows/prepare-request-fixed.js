/**
 * Prepare_Request1 (n8n Code node) — FIX FINAL DE LAYOUT
 *
 * OBJETIVO: Garantir que a "Folha de Rosto" termine nas assinaturas e
 * a peça "RAZÕES/AO EGRÉGIO" comece sempre em uma NOVA página.
 *
 * MECANISMO:
 * 1. Processa o texto e formatações.
 * 2. Detecta o ponto exato onde começa "AO EGRÉGIO...".
 * 3. Insere: Texto Parte 1 -> PAGE BREAK -> Texto Parte 2.
 * 4. Recalcula os índices de estilo (shift +1) para a segunda parte.
 *
 * FIX (espaçamento página 2):
 *   splitIndex agora aponta para DEPOIS do \n separador, não para o \n em si.
 *   Isso evita que part2 comece com \n, o que criava um parágrafo vazio
 *   no topo da página 2 e causava espaçamento indesejado.
 */

const doc = $input.first().json || {};
const docId = doc.documentId || doc.docId;

// --- docEnd: Posição para limpar o documento antes de reescrever
let docEnd = 1;
if (doc.body && Array.isArray(doc.body.content) && doc.body.content.length > 0) {
  const last = doc.body.content[doc.body.content.length - 1];
  if (typeof last.endIndex === "number") docEnd = last.endIndex;
}

// --- Texto vindo do SQL
let text = "";
const row = $("Execute a SQL query1").first();
if (row && row.json && row.json.content != null) text = row.json.content;
if (typeof text !== "string") text = String(text || "");

// 1) LIMPEZA GERAL
text = text.replace(/\s*-\s*Manutenção do acórdão regional/gi, "").trimEnd();

// >>> FIX: remove linhas vazias em excesso ANTES do fecho (para não empurrar pro rodapé)
text = text.replace(/\n(?:[ \t]*\n)+(?=\s*(?:Nesses|Nestes)\s+termos\b)/gi, "\n");

const rawLines = text.split("\n");

// 2) PARSER: Identifica **negrito**, *itálico* e estrutura de parágrafos
let fullText = "";
const boldRanges = [];
const italicRanges = [];
const paragraphRanges = [];

function pushRange(list, start, end) {
  if (typeof start === "number" && typeof end === "number" && start < end) list.push({ start, end });
}

function isLikelyQuoteLine(raw, nextRaw) {
  const t = (raw ?? "").trim();
  if (!t) return false;
  if (t.startsWith(">")) return true;
  if (t.startsWith("\u201c") || t.startsWith('"') || t.startsWith("'") || t.startsWith("\u2018")) return true;
  if (/^(EMENTA:)/i.test(t)) return true;
  if (/^(ACÓRDÃO)\b/i.test(t)) return true;

  if (t.endsWith(":")) {
    const n = (nextRaw ?? "").trim();
    if (n && (n.startsWith("\u201c") || n.startsWith('"') || n.startsWith(">"))) return true;
    if (n && n.length <= 200 && /[\u201c\u201d"]/.test(n)) return true;
  }
  return false;
}

for (let li = 0; li < rawLines.length; li++) {
  const line = rawLines[li] ?? "";
  const nextLine = rawLines[li + 1] ?? "";

  const startOfLine = fullText.length;
  let raw = line;
  const isQuote = isLikelyQuoteLine(raw, nextLine);

  if (raw.trim().startsWith(">")) raw = raw.replace(/^>\s?/, "");

  let out = "";
  let i = 0;

  while (i < raw.length) {
    // Negrito **
    if (raw.startsWith("**", i)) {
      const end = raw.indexOf("**", i + 2);
      if (end > i + 2) {
        const inner = raw.slice(i + 2, end);
        const s = fullText.length + out.length;
        out += inner;
        pushRange(boldRanges, s, s + inner.length);
        i = end + 2;
        continue;
      }
    }
    // Itálico *
    if (raw[i] === "*" && !raw.startsWith("**", i)) {
      const end = raw.indexOf("*", i + 1);
      if (end > i + 1) {
        const inner = raw.slice(i + 1, end);
        const s = fullText.length + out.length;
        out += inner;
        pushRange(italicRanges, s, s + inner.length);
        i = end + 1;
        continue;
      }
    }
    out += raw[i];
    i++;
  }

  // Italic automático (Latim)
  const latinPhrases = [
    /\bAb\s+initio\b/gi,
    /\bAd\s+argumentandum\s+tantum\b/gi,
    /\bVenire\s+contra\s+factum\s+proprium\b/gi,
  ];
  for (const re of latinPhrases) {
    let m;
    while ((m = re.exec(out)) !== null) {
      const s = fullText.length + m.index;
      pushRange(italicRanges, s, s + m[0].length);
    }
  }

  fullText += out + "\n";
  paragraphRanges.push({ start: startOfLine, end: fullText.length, isQuote });
}

// 3) LÓGICA DE QUEBRA (SPLIT)
//
// FIX: splitIndex aponta para o caractere APÓS o \n separador (splitMatch.index + 1).
// Antes apontava para o \n em si (splitMatch.index), fazendo part2 = "\nAO EGRÉGIO..."
// O \n extra no início de part2 criava um parágrafo vazio no topo da página 2,
// causando o espaçamento incorreto visível na segunda página.
// Agora part1 absorve o \n e part2 começa diretamente em "AO EGRÉGIO..." sem linha vazia.
const splitRegex = /\n\s*(?:AO\s+|A\s+)?(?:EGRÉGIO|COLENDO)\s+TRIBUNAL/i;
const splitMatch = fullText.match(splitRegex);

let splitIndex = -1;
if (splitMatch) {
  // +1: pula o \n para que part2 não comece com parágrafo vazio na página 2
  splitIndex = splitMatch.index + 1;
}

// 4) CONSTRUÇÃO DOS REQUESTS
const insertStart = 1;
const requests = [];

// Limpa documento antigo
if (docEnd > 1) {
  requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: docEnd - 1 } } });
}

if (splitIndex > -1) {
  const part1 = fullText.slice(0, splitIndex); // inclui o \n separador
  const part2 = fullText.slice(splitIndex);    // começa em "AO EGRÉGIO..." sem \n líder

  requests.push({ insertText: { location: { index: insertStart }, text: part1 } });
  requests.push({ insertPageBreak: { location: { index: insertStart + part1.length } } });
  requests.push({ insertText: { location: { index: insertStart + part1.length + 1 }, text: part2 } });
} else {
  requests.push({ insertText: { location: { index: insertStart }, text: fullText } });
}

function getShiftedIndex(originalIndex) {
  if (splitIndex > -1 && originalIndex >= splitIndex) {
    return insertStart + originalIndex + 1;
  }
  return insertStart + originalIndex;
}

// 5) ESTILIZAÇÃO (Margens, Fonte)
const CM = 28.3464567;

requests.push({
  updateDocumentStyle: {
    documentStyle: {
      pageSize: {
        width: { magnitude: 21.0 * CM, unit: "PT" },
        height: { magnitude: 29.7 * CM, unit: "PT" },
      },
      marginLeft: { magnitude: 3.0 * CM, unit: "PT" },
      marginRight: { magnitude: 3.0 * CM, unit: "PT" },
      marginTop: { magnitude: 2.75 * CM, unit: "PT" },
      marginBottom: { magnitude: 3.25 * CM, unit: "PT" },
    },
    fields: "pageSize,marginLeft,marginRight,marginTop,marginBottom",
  },
});

const totalLength = fullText.length + (splitIndex > -1 ? 1 : 0);
requests.push({
  updateTextStyle: {
    range: { startIndex: insertStart, endIndex: insertStart + totalLength },
    textStyle: {
      weightedFontFamily: { fontFamily: "Times New Roman" },
      fontSize: { magnitude: 12, unit: "PT" },
    },
    fields: "weightedFontFamily,fontSize",
  },
});

// 6) REGRAS DE LAYOUT (Alinhamentos)

const metaRe = /^\s*(RECORRENTE|RECORRIDO|AUTOS DO PROCESSO|PROCESSO Nº|PROCESSO N°|PROCESSO N[º°]|ADVOGADO|RECLAMADA|RECLAMANTE)\s*:/i;
const origemRe = /^\s*ORIGEM\s*:/i;
const exmoRe = /^\s*(EXCELENT[ÍI]SSIMO|EXMO)\b/i;
const titleMainRe = /^\s*CONTRARRAZ(Õ|O)ES\b.*\b(RECURSO\s+DE\s+REVISTA|RR)\b/i;
const titleRazoesRe = /^\s*RAZÕES\s+DAS\s+CONTRARRAZ(Õ|O)ES\b/i;
const romanSectionRe = /^\s*[IVXLCDM]+\s*-\s+/i;

const processoLinhaRe = /^\s*PROCESSO\s*N[º°]?\s*[\d.\-\/]+\s*$/i;
const reclamadaLinhaRe = /^\s*RECLAMAD[AO]\s*:\s*.+$/i;

const signatureTwoColsRe = /^\s*[A-Za-zÁÉÍÓÚÂÊÔÃÕÇ][^\n]{0,180}(?:\t+| {4,})[A-Za-zÁÉÍÓÚÂÊÔÃÕÇ]/;

const closeTermsRe = /^\s*(?:Nesses|Nestes)\s+termos\b/i;
const pedeDeferRe = /^\s*pede\s+deferimento\.?\s*$/i;
const rioLineRe = /^\s*Rio\s+de\s+Janeiro\b/i;

function isCapsLine(trimmed) {
  if (!trimmed) return false;
  if (trimmed.length > 140) return false;
  const up = trimmed.toUpperCase();
  const hasLetters = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(up);
  if (!hasLetters) return false;
  return trimmed === up;
}

const FIRST_LINE_INDENT_PT = 0.85 * CM;
const QUOTE_INDENT_START_PT = 4.0 * CM;

for (let i = 0; i < paragraphRanges.length; i++) {
  const p = paragraphRanges[i];

  const rawSeg = fullText.slice(p.start, p.end);
  const rawNoNl = rawSeg.endsWith("\n") ? rawSeg.slice(0, -1) : rawSeg;
  const trimmed = rawNoNl.trim();
  if (!trimmed) continue;

  const range = {
    startIndex: getShiftedIndex(p.start),
    endIndex: getShiftedIndex(p.end),
  };

  let align = "JUSTIFIED";
  let indentFirst = FIRST_LINE_INDENT_PT;
  let indentStart = 0;
  let spaceAbove = 0;
  let spaceBelow = 0;
  let forceBoldWhole = false;

  if (titleMainRe.test(trimmed) || titleRazoesRe.test(trimmed)) {
    align = "CENTER";
    indentFirst = 0;
    indentStart = 0;
    spaceAbove = 20;
    spaceBelow = 20;
    forceBoldWhole = true;
  } else if (exmoRe.test(trimmed)) {
    align = "CENTER";
    indentFirst = 0;
    indentStart = 0;
    forceBoldWhole = true;
  } else if (processoLinhaRe.test(trimmed) || reclamadaLinhaRe.test(trimmed)) {
    align = "START";
    indentFirst = 0;
    indentStart = 0;
    spaceAbove = 10;
    spaceBelow = 6;
  } else if (metaRe.test(rawNoNl) || origemRe.test(rawNoNl)) {
    align = "JUSTIFIED";
    indentFirst = 0;
    indentStart = 0;
    spaceBelow = 4;

    const m = rawNoNl.match(metaRe) || rawNoNl.match(origemRe);
    if (m && typeof m.index === "number") {
      const s = p.start + m.index;
      const e = s + m[0].length;
      pushRange(boldRanges, s, Math.min(e, p.end - 1));
    }
  } else if (romanSectionRe.test(trimmed)) {
    align = "JUSTIFIED";
    indentFirst = 0;
    indentStart = 0;
    spaceAbove = 12;
    spaceBelow = 6;
    forceBoldWhole = true;
  } else if (p.isQuote) {
    align = "JUSTIFIED";
    indentFirst = 0;
    indentStart = QUOTE_INDENT_START_PT;
    spaceAbove = 6;
    spaceBelow = 6;

    requests.push({
      updateTextStyle: {
        range,
        textStyle: { fontSize: { magnitude: 10, unit: "PT" } },
        fields: "fontSize",
      },
    });
  } else if (closeTermsRe.test(trimmed) || pedeDeferRe.test(trimmed)) {
    align = "START";
    indentFirst = FIRST_LINE_INDENT_PT;
    indentStart = 0;
    spaceAbove = 12;
    spaceBelow = 0;
  } else if (rioLineRe.test(trimmed)) {
    align = "START";
    indentFirst = 0;
    indentStart = 0;
    spaceAbove = 12;
    spaceBelow = 0;
  } else if (signatureTwoColsRe.test(rawNoNl)) {
    align = "START";
    indentFirst = 0;
    indentStart = 0;
  } else if (isCapsLine(trimmed)) {
    align = "CENTER";
    indentFirst = 0;
    indentStart = 0;
  }

  requests.push({
    updateParagraphStyle: {
      range,
      paragraphStyle: {
        alignment: align,
        lineSpacing: 100,
        indentFirstLine: { magnitude: indentFirst, unit: "PT" },
        indentStart: { magnitude: indentStart, unit: "PT" },
        spaceAbove: { magnitude: spaceAbove, unit: "PT" },
        spaceBelow: { magnitude: spaceBelow, unit: "PT" },
      },
      fields: "alignment,lineSpacing,indentFirstLine,indentStart,spaceAbove,spaceBelow",
    },
  });

  if (forceBoldWhole) {
    pushRange(boldRanges, p.start, Math.max(p.start, p.end - 1));
  }
}

// 7) Aplica Negrito/Itálico (com Shift)
function applyTextStyleRanges(ranges, style, fields) {
  for (const r of ranges) {
    if (!(r && r.start < r.end)) continue;

    requests.push({
      updateTextStyle: {
        range: {
          startIndex: getShiftedIndex(r.start),
          endIndex: getShiftedIndex(r.end),
        },
        textStyle: style,
        fields,
      },
    });
  }
}

applyTextStyleRanges(boldRanges, { bold: true }, "bold");
applyTextStyleRanges(italicRanges, { italic: true }, "italic");

return [{ json: { docId, body: { requests } } }];
