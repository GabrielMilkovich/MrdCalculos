/**
 * Parser determinístico de Recibo de Férias.
 *
 * Variabilidade ALTA entre empregadores. Quando regex falha em achar um
 * campo, deixa null e UI permite preenchimento manual.
 *
 * Detecta múltiplos blocos quando o documento tem mais de 1 período de
 * férias (ex: PDF consolidado).
 */

export type SituacaoFerias = "G" | "GP" | "NG" | "I" | "P";

export type GozoPeriodo = {
  inicio: string; // "dd/MM/yyyy"
  fim: string;
  dobra: boolean;
};

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
};

const RE_RELATIVA = /\b(20\d{2})\s*\/\s*(20\d{2})\b/;
const RE_PERIODO_AQUISITIVO_DATAS =
  /\bper[íi]odo\s+aquisitivo\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i;
const RE_GOZO =
  /\bper[íi]odo\s+(?:de\s+)?gozo\s*:?\s*(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/gi;
const RE_ABONO_DIAS = /\babono\s+(?:pecuni[áa]rio)?\s*:?\s*(\d+)\s*dias?\b/i;
const RE_PRAZO = /\b(\d{1,3})\s*dias\s+de\s+f[ée]rias\b/i;
const RE_INDENIZADAS = /\bindenizad[ao]s?\b/i;
const RE_NAO_GOZADAS = /\bn[ãa]o\s*gozadas?\b/i;
const RE_PERDIDAS = /\bperdidas?\b/i;

const RE_BLOCO_FERIAS =
  /\b(recibo|aviso|comunicado|termo)\s+de\s+f[ée]rias\b/gi;

export function parseFerias(ocrText: string): ParseFeriasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { ferias: [], warnings: ["OCR vazio"] };
  }

  const blocos = splitInBlocks(ocrText);
  const warnings: string[] = [];
  const ferias: FeriasParseada[] = [];

  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];
    const f = parseOneBlock(bloco, warnings, i);
    if (f) ferias.push(f);
  }

  if (ferias.length === 0) {
    warnings.push(
      "Nenhum período de férias detectado. Use o formulário manual.",
    );
  }

  return { ferias, warnings };
}

function splitInBlocks(text: string): string[] {
  // Divide por marcadores "Recibo de Férias", "Aviso de Férias", etc.
  // Se não houver marcador, retorna o texto inteiro como 1 bloco.
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
): FeriasParseada | null {
  // 1) Relativa (período aquisitivo aaaa/aaaa)
  const relativaMatch = bloco.match(RE_RELATIVA);
  if (!relativaMatch) {
    warnings.push(`Bloco ${idx + 1}: relativa (aaaa/aaaa) não encontrada — descartado.`);
    return null;
  }
  const relativa = `${relativaMatch[1]}/${relativaMatch[2]}`;

  // 2) Prazo (dias de férias)
  const prazoMatch = bloco.match(RE_PRAZO);
  const prazo = prazoMatch ? parseInt(prazoMatch[1], 10) : 30;
  if (!prazoMatch) {
    warnings.push(`Bloco ${idx + 1} (${relativa}): prazo não detectado, usando 30.`);
  }

  // 3) Gozos (até 3)
  const gozoMatches = [...bloco.matchAll(RE_GOZO)].slice(0, 3);
  const gozo1 = gozoMatches[0]
    ? { inicio: gozoMatches[0][1], fim: gozoMatches[0][2], dobra: false }
    : null;
  const gozo2 = gozoMatches[1]
    ? { inicio: gozoMatches[1][1], fim: gozoMatches[1][2], dobra: false }
    : null;
  const gozo3 = gozoMatches[2]
    ? { inicio: gozoMatches[2][1], fim: gozoMatches[2][2], dobra: false }
    : null;

  // 4) Situação
  let situacao: SituacaoFerias = "NG";
  if (RE_INDENIZADAS.test(bloco)) situacao = "I";
  else if (RE_PERDIDAS.test(bloco)) situacao = "P";
  else if (gozo1) situacao = "G";
  else if (RE_NAO_GOZADAS.test(bloco)) situacao = "NG";

  // 5) Abono pecuniário
  const abonoMatch = bloco.match(RE_ABONO_DIAS);
  const abono = !!abonoMatch;
  const dias_abono = abonoMatch ? parseInt(abonoMatch[1], 10) : 0;

  return {
    relativa,
    prazo,
    situacao,
    dobra_geral: false,
    abono,
    dias_abono,
    gozo1,
    gozo2,
    gozo3,
  };
}
