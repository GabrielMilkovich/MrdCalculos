/**
 * Parser determinístico de Recibo de Férias.
 *
 * Garantias:
 *   - Aceita relativa de 1900 em diante (vínculos antigos).
 *   - Detecta gozos por múltiplos padrões: "período de gozo", "gozo de
 *     X a Y", "férias de X a Y", "gozadas no período X a Y".
 *   - Sempre devolve `unparsed_lines` para conferência manual.
 *
 * Variabilidade ALTA entre empregadores. UI obrigatoriamente mostra o
 * resultado para revisão antes de baixar CSV.
 */

import type { GozoPeriodo, SituacaoFerias } from "../types";

export type FeriasParseada = {
  relativa: string; // "aaaa/aaaa"
  prazo: number;
  situacao: SituacaoFerias;
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: GozoPeriodo | null;
  gozo2: GozoPeriodo | null;
  gozo3: GozoPeriodo | null;
};

export type ParseFeriasResult = {
  ferias: FeriasParseada[];
  warnings: string[];
  /** Linhas com data ou número que não casaram com nenhum bloco — revisar. */
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
};

// Aceita relativa 19xx/19xx ou 20xx/20xx.
const RE_RELATIVA = /\b(19\d{2}|20\d{2})\s*\/\s*(19\d{2}|20\d{2})\b/;
// Múltiplas variantes de gozo.
const RE_GOZO_LABELED =
  /\b(?:per[íi]odo\s+(?:de\s+)?gozo|gozo|gozadas?|f[ée]rias)\s*(?:de\s+|no\s+per[íi]odo\s+(?:de\s+)?)?(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{2}\/\d{2}\/\d{4})/gi;
// Fallback genérico: "data a data" em linha que cita "gozo" ou contexto similar.
const RE_DATA_A_DATA = /(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{2}\/\d{2}\/\d{4})/g;
const RE_AQUISITIVO_DATAS =
  /\b(?:aquisitivo|per[íi]odo\s+aquisitivo)\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_ABONO_DIAS =
  /\babono\s+(?:pecuni[áa]rio)?\s*(?:de\s+)?:?\s*(\d+)\s*dias?\b/i;
const RE_PRAZO = /\b(\d{1,3})\s*(?:dias\s+de\s+f[ée]rias|dias?\s+\(?prazo)/i;
const RE_INDENIZADAS = /\bindeniza(?:d[ao]s?|tivas?)\b/i;
const RE_NAO_GOZADAS = /\bn[ãa]o\s*gozadas?\b/i;
const RE_PERDIDAS = /\bperdidas?\b/i;
const RE_GOZADAS_PARC = /\bgozadas?\s*parcialmente\b/i;
const RE_DOBRA_GERAL = /\bdobra(?:\s+geral)?\b/i;
const RE_TEM_DIGITO = /\d/;

const RE_BLOCO_FERIAS =
  /\b(recibo|aviso|comunicado|termo|solicita[çc][ãa]o)\s+de\s+f[ée]rias\b/gi;

export function parseFerias(ocrText: string): ParseFeriasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { ferias: [], warnings: ["OCR vazio."], unparsed_lines: [] };
  }

  const blocos = splitInBlocks(ocrText);
  const warnings: string[] = [];
  const ferias: FeriasParseada[] = [];
  const allLines = ocrText.split(/\r?\n/);
  const linhasUsadas = new Set<number>();

  for (let i = 0; i < blocos.length; i++) {
    const f = parseOneBlock(blocos[i], warnings, i, linhasUsadas, allLines);
    if (f) ferias.push(f);
  }

  // Linhas com data não consumida = candidatas a férias não detectadas
  const unparsed: Array<{ linha: number; conteudo: string }> = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (linhasUsadas.has(i)) continue;
    if (!RE_TEM_DIGITO.test(line)) continue;
    const hasData = /\d{2}\/\d{2}\/\d{4}/.test(line);
    const hasRelat = RE_RELATIVA.test(line);
    if (hasData || hasRelat) {
      unparsed.push({ linha: i + 1, conteudo: line });
    }
  }

  if (ferias.length === 0) {
    warnings.push(
      "Nenhum período de férias detectado automaticamente. Use o formulário para adicionar manualmente.",
    );
  }

  return { ferias, warnings, unparsed_lines: unparsed };
}

function splitInBlocks(text: string): string[] {
  const matches = [...text.matchAll(RE_BLOCO_FERIAS)];
  if (matches.length === 0) return [text];
  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = matches[i + 1]?.index ?? text.length;
    blocks.push(text.slice(start, end));
  }
  return blocks;
}

function parseOneBlock(
  bloco: string,
  warnings: string[],
  idx: number,
  linhasUsadas: Set<number>,
  allLines: string[],
): FeriasParseada | null {
  const relativaMatch = bloco.match(RE_RELATIVA);
  if (!relativaMatch) {
    warnings.push(
      `Bloco ${idx + 1}: relativa (aaaa/aaaa) não encontrada — ignorado.`,
    );
    return null;
  }
  const relativa = `${relativaMatch[1]}/${relativaMatch[2]}`;

  const prazoMatch = bloco.match(RE_PRAZO);
  const prazo = prazoMatch ? parseInt(prazoMatch[1], 10) : 30;
  if (!prazoMatch) {
    warnings.push(`Bloco ${idx + 1} (${relativa}): prazo não detectado, usando 30 dias.`);
  }

  // Gozos: tenta primeiro com label, fallback com data-a-data.
  const gozoMatchesLabeled = [...bloco.matchAll(RE_GOZO_LABELED)].slice(0, 3);
  let gozos: Array<{ inicio: string; fim: string }> = gozoMatchesLabeled.map(
    (m) => ({ inicio: m[1], fim: m[2] }),
  );
  if (gozos.length === 0) {
    // Fallback: pega todos "data a data" no bloco e remove o do aquisitivo.
    const aqMatch = bloco.match(RE_AQUISITIVO_DATAS);
    const aqRange = aqMatch ? `${aqMatch[1]}|${aqMatch[2]}` : null;
    const dataAdata = [...bloco.matchAll(RE_DATA_A_DATA)]
      .map((m) => ({ inicio: m[1], fim: m[2] }))
      .filter((g) => `${g.inicio}|${g.fim}` !== aqRange);
    gozos = dataAdata.slice(0, 3);
    if (gozos.length > 0) {
      warnings.push(
        `Bloco ${idx + 1} (${relativa}): gozos detectados sem label explícito — confirme.`,
      );
    }
  }
  const dobraGeral = RE_DOBRA_GERAL.test(bloco);
  const gozo1 = gozos[0]
    ? { inicio: gozos[0].inicio, fim: gozos[0].fim, dobra: false }
    : null;
  const gozo2 = gozos[1]
    ? { inicio: gozos[1].inicio, fim: gozos[1].fim, dobra: false }
    : null;
  const gozo3 = gozos[2]
    ? { inicio: gozos[2].inicio, fim: gozos[2].fim, dobra: false }
    : null;

  let situacao: SituacaoFerias = "NG";
  if (RE_INDENIZADAS.test(bloco)) situacao = "I";
  else if (RE_PERDIDAS.test(bloco)) situacao = "P";
  else if (RE_GOZADAS_PARC.test(bloco)) situacao = "GP";
  else if (gozo1) situacao = "G";
  else if (RE_NAO_GOZADAS.test(bloco)) situacao = "NG";

  const abonoMatch = bloco.match(RE_ABONO_DIAS);
  const abono = !!abonoMatch;
  const dias_abono = abonoMatch ? parseInt(abonoMatch[1], 10) : 0;

  // Marca linhas do bloco como usadas (heurística: linhas que contêm trechos do bloco)
  const blocoLines = bloco.split(/\r?\n/);
  for (const bl of blocoLines) {
    const trimmed = bl.trim();
    if (trimmed.length === 0) continue;
    for (let k = 0; k < allLines.length; k++) {
      if (allLines[k].trim() === trimmed) linhasUsadas.add(k);
    }
  }

  return {
    relativa,
    prazo,
    situacao,
    dobra_geral: dobraGeral,
    abono,
    dias_abono,
    gozo1,
    gozo2,
    gozo3,
  };
}
