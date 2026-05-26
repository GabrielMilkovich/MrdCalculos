/**
 * Core CTPS parser — módulo puro compartilhado entre cliente Vite e edge Deno.
 *
 * Zero dependências externas. Regex determinístico. Testável offline.
 *
 * Consumers:
 *   - src/features/data-extraction/parsers/ferias.ts (shim)
 *   - src/features/data-extraction/parsers/faltas.ts (shim)
 *   - supabase/functions/_shared/mappers/ctps.ts (via path relativo Deno)
 */

// ── Tipos ──

export type GozoPeriodo = {
  inicio: string; // dd/MM/yyyy
  fim: string;
  dobra: boolean;
};

export type SituacaoFerias = 'G' | 'GP' | 'NG' | 'I' | 'P';

export type FeriasParseada = {
  relativa: string;
  prazo: number;
  prazo_origem?: 'detectado' | 'default' | 'ajustado';
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
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
};

export type TipoAfastamento =
  | 'falta_simples'
  | 'atestado'
  | 'aux_doenca'
  | 'licenca_maternidade'
  | 'licenca_paternidade'
  | 'licenca_medica'
  | 'suspensao'
  | 'outros';

export type FaltaParseada = {
  data_inicio: string; // "yyyy-mm-dd"
  data_fim: string;
  tipo_afastamento: TipoAfastamento;
  duracao_dias: number;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
};

export type ParseFaltasResult = {
  faltas: FaltaParseada[];
  warnings: string[];
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
};

// ── OCR normalizer (Bloco 6 — corrige C4) ──

export function normalizarOcrDegradado(texto: string): string {
  return texto
    .replace(/\bLicenc?ga\b/gi, 'Licença')
    .replace(/\bSituag[acdoã]+o?\b/gi, 'Situação')
    .replace(/\bAtualizag[oõ]+e?s\b/gi, 'Atualizações')
    .replace(/\bAnotag[oõ]+e?s\b/gi, 'Anotações')
    .replace(/\bFun[c¢]a?[oã]o?\b/gi, 'Função')
    .replace(/\bFunga?o\b/gi, 'Função')
    .replace(/\bRescisdo\b/gi, 'Rescisão')
    .replace(/\bRescisao\b/gi, 'Rescisão')
    .replace(/\bAlterag[acdoã]+o?\b/gi, 'Alteração')
    .replace(/\bObservag[oõ]+e?s\b/gi, 'Observações')
    .replace(/\bCIPS\b/g, 'CTPS')
    .replace(/\bCTRS\b/g, 'CTPS');
}

export function detectarOcrDegradado(texto: string): boolean {
  return /\b(Licenc?ga|Situag|Atualizag|Anotag|Fungao|Fun[c¢][aã]o|Rescisdo|CIPS|Alterag[ado]|Observag)/i.test(texto);
}

// ── Regex: férias ──

const RE_RELATIVA = /\b(19\d{2}|20\d{2})\s*\/\s*(19\d{2}|20\d{2})\b/;

const RE_GOZO_LABELED =
  /\b(?:per[íi]odo\s+(?:de\s+)?gozo|gozo|gozadas?|f[ée]rias)\s*(?:de\s+|no\s+per[íi]odo\s+(?:de\s+)?)?(\d{2}\/\d{2}\/\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{2}\/\d{2}\/\d{4})/gi;

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
const RE_DOBRA_GENERICA =
  /\b(?:em\s+dobra|em\s+dobro|dobrad[ao]|dobra\s+geral)\b/i;
const RE_TEM_DIGITO = /\d/;

const RE_BLOCO_FERIAS =
  /\b(recibo|aviso|comunicado|termo|solicita[çc][ãa]o|hist[óo]rico)\s+de\s+f[ée]rias\b/gi;

// [C1 fix] Aceita: " a ", " - ", " – ", " até "; dias inteiros OU decimais; abono opcional
// Abono group uses [ \t]+ (not \s+) to avoid consuming across newlines into next row
const RE_CTPS_FERIAS_ROW =
  /(\d{2}\/\d{2}\/\d{4})\s*(?:a|-|–|até)\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s*(?:a|-|–|até)\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{1,3})(?:[.,]\d{1,2})?(?:[ \t]+(\d{1,3})(?:[.,]\d{1,2})?)?/g;

// ── Regex: faltas ──

const RE_INTERVALO_DATA =
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/i;

const RE_DUAS_DATAS_SEPARADAS =
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b\s+\S+(?:\s+\S+)*?\s+\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;

const RE_DATA_UNICA = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;

// [C2 fix] Expanded: covers Declaração em horas, gala, nojo, paternidade, acidente do trabalho, CIPA
const RE_LINHA_FALTA =
  /\b(falt\w*|aus[êe]nc\w+|n[ãa]o\s*compareceu|atestad\w*|licen[çc]a|afastament\w*|abon\w*|aux[ií]li[ao]|doen[çc]a|suspens\w*|declara[çc][ãa]o\s+em\s+horas|gala|nojo|paternidad\w*|maternidad\w*|servi[çc]o\s+militar|acidente\s+(?:do\s+|de\s+)?trabalho|cipa)\b/i;

const RE_JUSTIFICATIVA =
  /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2,3}|m[ée]d\.?\s|hospital|interna[çc][ãa]o|cirurgia|gestante|gala|nojo|doa[çc][ãa]o\s+(?:de\s+)?sangue|licen[çc]a\s+(?:m[ée]dica|gestante|paternidade|maternidade|p[ée]ssimo|nojo|gala)|consulta\s+(?:m[ée]dica|odontol[oó]gica|psicol[oó]gica|hospitalar|com\s+(?:dr|dra|m[ée]dico)))\b/i;

const RE_INJUSTIFICADA = /\b(injustifica\w*|sem\s+justifica\w*|n[ãa]o\s+justifica\w*)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

const RE_BLOCO_FERIAS_HEADER = /\b(?:hist[óo]rico\s+de\s+f[ée]rias|f[ée]rias\s+gozadas|registro\s+de\s+f[ée]rias|per[íi]odos?\s+de\s+f[ée]rias)\b/i;
const RE_FIM_BLOCO_FERIAS = /\b(?:afastamentos?|registro\s+de\s+falt|hist[óo]rico\s+de\s+cargo|hist[óo]rico\s+de\s+lota[çc][ãa]o|contribui[çc][ãa]o\s+sindical|hist[óo]rico\s+salarial|anota[çc][oõ]es\s+gerais)\b/i;

type SecaoCTPS = 'fora' | 'afastamentos' | 'afastamentos_outros';

const RE_HEADER_AFASTAMENTOS_OUTROS = /^\s*AFASTAMENTOS\s+OUTROS\s*$/i;
const RE_HEADER_AFASTAMENTOS = /^\s*AFASTAMENTOS\s*$/i;

const RE_HEADER_OUTRA_SECAO = /^\s*(?:HIST[ÓO]RICO\s+(?:DE\s+)?(?:F[ÉE]RIAS|LOTA[ÇC][ÃA]O|CARGO|SALARIAL|DE\s+CARGO)|FUN[ÇC][ÕO]ES\s+EXERCIDAS|INFORMA[ÇC][ÕO]ES\s+SINDICAIS|ANOTA[ÇC][ÕO]ES\s+GERAIS|REGISTRO\s+DE\s+FALT|DADOS\s+(?:PESSOAIS|DE\s+EMPREGADO)|LOCAL\s+DE\s+TRABALHO|ENDERE[ÇC]O\s+RESIDENCIAL|DEPENDENTES|FUN[ÇC][ÃA]O\s+ATUAL|Data:\.{2,})/i;

const RE_EVENTO_CONTRATUAL = /\b(?:demiss[ãa]o|rescis[ãa]o(?:\s+(?:com\s+)?(?:justa\s+causa|por\s+\w+))?|aviso\s+pr[eé]vio|t[eé]rmino\s+(?:de\s+)?contrato|in[ií]cio\s+(?:de\s+)?contrato|admiss[ãa]o)\b/i;

// [C6 — Bloco 7] Férias adiantadas registradas em AFASTAMENTOS OUTROS
const RE_FERIAS_ADIANTADAS = /f[ée]rias\s+c\/?\s*adiant|f[ée]rias\s+adiantadas?|f[ée]rias\s+(?:em\s+)?goz/i;

// ── Helpers ──

function isoDate(yyyy: string, mm: string, dd: string): string {
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function isValidDate(yyyy: string, mm: string, dd: string): boolean {
  const y = parseInt(yyyy, 10);
  const m = parseInt(mm, 10);
  const d = parseInt(dd, 10);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

function computarDuracaoDias(inicio: string, fim: string): number {
  const d1 = new Date(inicio + 'T00:00:00Z');
  const d2 = new Date(fim + 'T00:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

const MAX_JUSTIFICATIVA_LEN = 200;

function faltaFingerprint(f: FaltaParseada): string {
  const j = (f.justificativa ?? '').trim().toLowerCase();
  return `${f.justificada ? 'S' : 'N'}|${j}`;
}

// ── Classificador de tipo de afastamento (Bloco 5 — corrige C3) ──

export function classificarTipoAfastamento(
  linha: string,
  duracaoDias: number,
  justificativa: string | null,
): TipoAfastamento {
  const norm = linha.toLowerCase();

  if (/suspens[ãa]o/i.test(norm)) return 'suspensao';

  // Lei 11.770/2008 — Programa Empresa Cidadã (60 dias extras de maternidade)
  if (/\bmat\.?\s*-?\s*extens|extens[ãa]o\s+(?:de\s+)?(?:licen[çc]a\s+)?maternidade|empresa\s+cidad/i.test(norm)) {
    return 'licenca_maternidade';
  }

  if (/licen[çc]a\s+maternidade|licenca.?gestante|sal[áa]rio.?maternidade/i.test(norm)) return 'licenca_maternidade';
  if (/licen[çc]a\s+paternidade/i.test(norm)) return 'licenca_paternidade';
  if (/aux[ií]lio\s+(?:doen[çc]a|previdenci[áa]rio)|inss/i.test(norm)) return 'aux_doenca';

  // "Declaração em horas" — afastamento parcial declarado em horas
  if (/declara[çc][ãa]o\s+em\s+horas/i.test(norm)) return 'outros';

  // Acidente do trabalho — CLT 118 (Súmula 378 TST)
  if (/acidente\s+(?:do\s+|de\s+)?trabalho|\bcat\b|comunica[çc][ãa]o\s+de\s+acidente/i.test(norm)) {
    return 'aux_doenca';
  }

  if (duracaoDias > 15) return 'aux_doenca';
  if (/licen[çc]a\s+m[ée]dica/i.test(norm)) return 'licenca_medica';
  if (/atestado/i.test(norm) || (justificativa && /m[ée]dic/i.test(justificativa))) return 'atestado';
  if (/falt\w*|aus[êe]nc/i.test(norm)) return 'falta_simples';
  return 'outros';
}

// ── Férias parser ──

function derivarRelativa(aqIni: string): string {
  const [, , y] = aqIni.split('/');
  const ano1 = parseInt(y, 10);
  return `${ano1}/${ano1 + 1}`;
}

const RE_DOBRA_GENERICA_GLOBAL =
  /\b(?:em\s+dobra|em\s+dobro|dobrad[ao]|dobra\s+geral)\b/gi;

function computeGozosWithDobra(
  bloco: string,
  matches: Array<{ idx: number; len: number; inicio: string; fim: string }>,
): Array<{ inicio: string; fim: string; dobra: boolean }> {
  const result = matches.map((m) => ({
    inicio: m.inicio,
    fim: m.fim,
    dobra: false,
  }));
  if (matches.length === 0) return result;

  const dobraMarks = [...bloco.matchAll(RE_DOBRA_GENERICA_GLOBAL)].map((m) => ({
    idx: m.index ?? 0,
    len: m[0].length,
  }));

  for (const d of dobraMarks) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const mEnd = m.idx + m.len;
      let dist: number;
      if (d.idx >= m.idx && d.idx < mEnd) dist = 0;
      else if (d.idx >= mEnd) dist = d.idx - mEnd;
      else dist = m.idx - (d.idx + d.len);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDist <= 60) {
      result[bestIdx].dobra = true;
    }
  }
  return result;
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

function parseCtpsTabularFerias(ocrText: string): FeriasParseada[] {
  const inicio = ocrText.search(/HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS/i);
  if (inicio === -1) return [];

  const restText = ocrText.slice(inicio);
  const fimMatch = restText.slice(30).search(
    /\n\s*(?:AFASTAMENTOS|ANOTA[ÇC][ÕO]ES|HIST[ÓO]RICO\s+(?:DE\s+CARGO|SALARIAL)|CONTRIBUI[ÇC][ÃA]O|REGISTRO\s+DE\s+FALT)/i,
  );
  const secao = fimMatch === -1 ? restText : restText.slice(0, 30 + fimMatch);

  const ferias: FeriasParseada[] = [];
  const re = new RegExp(RE_CTPS_FERIAS_ROW.source, 'g');
  let match;
  while ((match = re.exec(secao)) !== null) {
    const [, aqIni, aqFim, gozoIni, gozoFim, diasStr, abonoStr] = match;

    // [C1 fix] dias decimais → inteiro
    const diasGozo = Math.round(parseFloat(diasStr.replace(',', '.')));
    const diasAbono = abonoStr ? Math.round(parseFloat(abonoStr.replace(',', '.'))) : 0;

    // Validate dates
    const aqIniParts = aqIni.split('/');
    const aqFimParts = aqFim.split('/');
    const gozoIniParts = gozoIni.split('/');
    const gozoFimParts = gozoFim.split('/');
    if (
      !isValidDate(aqIniParts[2], aqIniParts[1], aqIniParts[0]) ||
      !isValidDate(aqFimParts[2], aqFimParts[1], aqFimParts[0]) ||
      !isValidDate(gozoIniParts[2], gozoIniParts[1], gozoIniParts[0]) ||
      !isValidDate(gozoFimParts[2], gozoFimParts[1], gozoFimParts[0])
    ) {
      continue;
    }

    ferias.push({
      relativa: derivarRelativa(aqIni),
      prazo: diasGozo + diasAbono,
      prazo_origem: 'detectado',
      situacao: 'G',
      dobra_geral: false,
      abono: diasAbono > 0,
      dias_abono: diasAbono,
      gozo1: { inicio: gozoIni, fim: gozoFim, dobra: false },
      gozo2: null,
      gozo3: null,
    });
  }
  return ferias;
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
  const prazoBruto = prazoMatch ? parseInt(prazoMatch[1], 10) : 30;
  let prazo = prazoBruto;
  let prazoOrigem: 'detectado' | 'default' | 'ajustado' = 'detectado';
  if (!prazoMatch) {
    prazoOrigem = 'default';
    warnings.push(`Bloco ${idx + 1} (${relativa}): prazo não detectado, usando 30 dias.`);
  } else if (prazoBruto <= 0) {
    prazo = 30;
    prazoOrigem = 'ajustado';
    warnings.push(
      `Bloco ${idx + 1} (${relativa}): prazo inválido (${prazoBruto}) — usando 30 dias.`,
    );
  } else if (prazoBruto > 60) {
    prazo = 60;
    prazoOrigem = 'ajustado';
    warnings.push(
      `Bloco ${idx + 1} (${relativa}): prazo ${prazoBruto} dias acima do limite PJe-Calc (60) — capado em 60.`,
    );
  }

  type GozoCand = { inicio: string; fim: string; dobra: boolean };
  const gozoMatchesLabeled = [...bloco.matchAll(RE_GOZO_LABELED)].slice(0, 3);
  let firstGozoIdx = bloco.length;
  let gozos: GozoCand[] = computeGozosWithDobra(
    bloco,
    gozoMatchesLabeled.map((m) => ({ idx: m.index ?? 0, len: m[0].length, inicio: m[1], fim: m[2] })),
  );
  if (gozos.length > 0) firstGozoIdx = gozoMatchesLabeled[0].index ?? 0;
  if (gozos.length === 0) {
    const aqMatch = bloco.match(RE_AQUISITIVO_DATAS);
    const aqRange = aqMatch ? `${aqMatch[1]}|${aqMatch[2]}` : null;
    const dataAdata = [...bloco.matchAll(RE_DATA_A_DATA)].filter(
      (m) => `${m[1]}|${m[2]}` !== aqRange,
    );
    gozos = computeGozosWithDobra(
      bloco,
      dataAdata.slice(0, 3).map((m) => ({
        idx: m.index ?? 0,
        len: m[0].length,
        inicio: m[1],
        fim: m[2],
      })),
    );
    if (gozos.length > 0) {
      firstGozoIdx = dataAdata[0].index ?? 0;
      warnings.push(
        `Bloco ${idx + 1} (${relativa}): gozos detectados sem label explícito — confirme.`,
      );
    }
  }

  const headerSlice = bloco.slice(0, Math.min(firstGozoIdx, 200));
  const dobraGeralExplicita = RE_DOBRA_GENERICA.test(headerSlice);
  const todosGozosDobra = gozos.length > 0 && gozos.every((g) => g.dobra);
  const dobraGeral = dobraGeralExplicita || todosGozosDobra;
  const finalDobra = (g: GozoCand): boolean => g.dobra || dobraGeral;
  const gozo1 = gozos[0]
    ? { inicio: gozos[0].inicio, fim: gozos[0].fim, dobra: finalDobra(gozos[0]) }
    : null;
  const gozo2 = gozos[1]
    ? { inicio: gozos[1].inicio, fim: gozos[1].fim, dobra: finalDobra(gozos[1]) }
    : null;
  const gozo3 = gozos[2]
    ? { inicio: gozos[2].inicio, fim: gozos[2].fim, dobra: finalDobra(gozos[2]) }
    : null;

  let situacao: SituacaoFerias = 'NG';
  if (RE_INDENIZADAS.test(bloco)) situacao = 'I';
  else if (RE_PERDIDAS.test(bloco)) situacao = 'P';
  else if (RE_GOZADAS_PARC.test(bloco)) situacao = 'GP';
  else if (gozo1) situacao = 'G';
  else if (RE_NAO_GOZADAS.test(bloco)) situacao = 'NG';

  const abonoMatch = bloco.match(RE_ABONO_DIAS);
  const abono = !!abonoMatch;
  const dias_abono = abonoMatch ? parseInt(abonoMatch[1], 10) : 0;

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
    prazo_origem: prazoOrigem,
    situacao,
    dobra_geral: dobraGeral,
    abono,
    dias_abono,
    gozo1,
    gozo2,
    gozo3,
  };
}

export function parseFerias(ocrText: string): ParseFeriasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { ferias: [], warnings: ['OCR vazio.'], unparsed_lines: [] };
  }

  // Normaliza OCR degradado antes de parsing
  let textoNormalizado = ocrText;
  const warningsNorm: string[] = [];
  if (detectarOcrDegradado(ocrText)) {
    textoNormalizado = normalizarOcrDegradado(ocrText);
    warningsNorm.push('Texto OCR degradado detectado — substituições aplicadas (ç↔g, etc).');
  }

  const ctpsFerias = parseCtpsTabularFerias(textoNormalizado);

  const blocos = splitInBlocks(textoNormalizado);
  const warnings: string[] = [...warningsNorm];
  const ferias: FeriasParseada[] = [...ctpsFerias];
  const allLines = textoNormalizado.split(/\r?\n/);
  const linhasUsadas = new Set<number>();

  if (ctpsFerias.length > 0) {
    const reTest = new RegExp(RE_CTPS_FERIAS_ROW.source, 'g');
    for (let i = 0; i < allLines.length; i++) {
      reTest.lastIndex = 0;
      if (reTest.test(allLines[i])) {
        linhasUsadas.add(i);
      }
      if (/HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS/i.test(allLines[i])) {
        linhasUsadas.add(i);
      }
    }
  }

  for (let i = 0; i < blocos.length; i++) {
    const f = parseOneBlock(blocos[i], warnings, i, linhasUsadas, allLines);
    if (f) ferias.push(f);
  }

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
      'Nenhum período de férias detectado automaticamente. Use o formulário para adicionar manualmente.',
    );
  }

  return { ferias, warnings, unparsed_lines: unparsed };
}

// ── Faltas parser ──

function identificarLinhasDeAfastamento(
  lines: string[],
): Map<number, SecaoCTPS> {
  const map = new Map<number, SecaoCTPS>();
  let secao: SecaoCTPS = 'fora';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (RE_HEADER_AFASTAMENTOS_OUTROS.test(line)) {
      secao = 'afastamentos_outros';
      continue;
    }
    if (RE_HEADER_AFASTAMENTOS.test(line)) {
      secao = 'afastamentos';
      continue;
    }
    if (secao !== 'fora' && RE_HEADER_OUTRA_SECAO.test(line)) {
      secao = 'fora';
      continue;
    }
    if (secao !== 'fora') {
      map.set(i, secao);
    }
  }
  return map;
}

function identificarLinhasDeFerias(lines: string[]): Set<number> {
  const excluir = new Set<number>();
  let dentroDeFerias = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (RE_BLOCO_FERIAS_HEADER.test(line)) {
      dentroDeFerias = true;
      excluir.add(i);
      continue;
    }
    if (dentroDeFerias && RE_FIM_BLOCO_FERIAS.test(line)) {
      dentroDeFerias = false;
      continue;
    }
    if (dentroDeFerias) {
      excluir.add(i);
    }
  }
  return excluir;
}

export function parseFaltas(ocrText: string): ParseFaltasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { faltas: [], warnings: ['OCR vazio.'], unparsed_lines: [] };
  }

  // Normaliza OCR degradado antes de parsing
  let textoNormalizado = ocrText;
  const warningsNorm: string[] = [];
  if (detectarOcrDegradado(ocrText)) {
    textoNormalizado = normalizarOcrDegradado(ocrText);
    warningsNorm.push('Texto OCR degradado detectado — substituições aplicadas (ç↔g, etc).');
  }

  const lines = textoNormalizado.split(/\r?\n/);
  const faltas: FaltaParseada[] = [];
  const warnings: string[] = [...warningsNorm];
  const unparsed: Array<{ linha: number; conteudo: string }> = [];

  const linhasDeFerias = identificarLinhasDeFerias(lines);
  if (linhasDeFerias.size > 0) {
    warnings.push(
      `${linhasDeFerias.size} linhas de bloco "HISTÓRICO DE FÉRIAS" excluídas ` +
        `do parsing de faltas (evita confusão período aquisitivo → falta).`,
    );
  }

  const linhasDeAfastamento = identificarLinhasDeAfastamento(lines);
  const modoCtpsEstruturada = linhasDeAfastamento.size > 0;
  if (modoCtpsEstruturada) {
    warnings.push(
      `CTPS estruturada detectada — parser aplicará detecção de seção ` +
        `(${linhasDeAfastamento.size} linhas dentro de AFASTAMENTOS/OUTROS).`,
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (linhasDeFerias.has(i)) continue;

    const secaoLinha = linhasDeAfastamento.get(i);
    if (modoCtpsEstruturada && !secaoLinha) continue;

    if (secaoLinha === 'afastamentos' && RE_EVENTO_CONTRATUAL.test(line)) {
      continue;
    }

    const isFaltaLine = RE_LINHA_FALTA.test(line);
    const intervaloMatch = line.match(RE_INTERVALO_DATA);
    const duasDatasMatch = !intervaloMatch ? line.match(RE_DUAS_DATAS_SEPARADAS) : null;
    const dataMatch = !intervaloMatch && !duasDatasMatch ? line.match(RE_DATA_UNICA) : null;

    let dataInicio: string | null = null;
    let dataFim: string | null = null;

    if (intervaloMatch) {
      const [, dd1, mm1, yyyy1, dd2, mm2, yyyy2] = intervaloMatch;
      if (!isValidDate(yyyy1, mm1, dd1) || !isValidDate(yyyy2, mm2, dd2)) {
        warnings.push(`Linha ${i + 1}: data inválida no intervalo.`);
        continue;
      }
      dataInicio = isoDate(yyyy1, mm1, dd1);
      dataFim = isoDate(yyyy2, mm2, dd2);
      if (dataInicio > dataFim) {
        warnings.push(
          `Linha ${i + 1}: intervalo invertido (${dataInicio} > ${dataFim}). Linha ignorada.`,
        );
        continue;
      }
    } else if (duasDatasMatch && (isFaltaLine || secaoLinha)) {
      // In structured CTPS mode, any two-date line in an AFASTAMENTOS section is valid
      const [, dd1, mm1, yyyy1, dd2, mm2, yyyy2] = duasDatasMatch;
      if (!isValidDate(yyyy1, mm1, dd1) || !isValidDate(yyyy2, mm2, dd2)) {
        warnings.push(`Linha ${i + 1}: data inválida no par de datas.`);
        continue;
      }
      dataInicio = isoDate(yyyy1, mm1, dd1);
      dataFim = isoDate(yyyy2, mm2, dd2);
      if (dataInicio > dataFim) {
        warnings.push(
          `Linha ${i + 1}: afastamento com data fim anterior ao início (${dataInicio} > ${dataFim}).`,
        );
        dataFim = dataInicio;
      }
    } else if (isFaltaLine && dataMatch) {
      const [, dd, mm, yyyy] = dataMatch;
      if (!isValidDate(yyyy, mm, dd)) {
        warnings.push(`Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}.`);
        continue;
      }
      dataInicio = isoDate(yyyy, mm, dd);
      dataFim = dataInicio;
    } else if (isFaltaLine && !dataMatch) {
      unparsed.push({ linha: i + 1, conteudo: line });
      continue;
    } else if (dataMatch && !isFaltaLine) {
      continue;
    } else {
      continue;
    }

    if (!dataInicio || !dataFim) continue;

    // [C6 — Bloco 7] Férias adiantadas — não é falta
    if (RE_FERIAS_ADIANTADAS.test(line)) {
      warnings.push(
        `Linha ${i + 1}: detectado gozo adiantado de férias (${dataInicio} → ${dataFim}). ` +
          `NÃO adicionado como falta. Confira HISTÓRICO DE FÉRIAS — se ausente lá, ` +
          `adicione manualmente como gozo no editor de férias.`,
      );
      continue;
    }

    let justificada = false;
    if (RE_INJUSTIFICADA.test(line)) {
      justificada = false;
    } else if (RE_JUSTIFICATIVA.test(line)) {
      justificada = true;
    }

    const reiniciar = RE_REINICIA.test(line);

    let justificativa: string | null = null;
    const justMatch = line.match(RE_JUSTIFICATIVA);
    if (justMatch) {
      const idx = line.toLowerCase().indexOf(justMatch[1].toLowerCase());
      let texto = line.slice(idx, idx + MAX_JUSTIFICATIVA_LEN);
      const proxData = texto.search(/\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}/);
      if (proxData !== -1) texto = texto.slice(0, proxData);
      const blocoEspacos = texto.search(/\s{4,}/);
      if (blocoEspacos !== -1) texto = texto.slice(0, blocoEspacos);
      justificativa = texto.trim();
    } else if (secaoLinha) {
      // Structured CTPS: capture description between dates as justificativa
      const descricao = line
        .replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (descricao.length > 0) justificativa = descricao;
    }

    const duracao = computarDuracaoDias(dataInicio, dataFim);
    const tipo = classificarTipoAfastamento(line, duracao, justificativa);

    faltas.push({
      data_inicio: dataInicio,
      data_fim: dataFim,
      tipo_afastamento: tipo,
      duracao_dias: duracao,
      justificada,
      reiniciar_periodo_aquisitivo: reiniciar,
      justificativa,
    });
  }

  // Dedup
  const groups = new Map<string, FaltaParseada[]>();
  for (const f of faltas) {
    const k = `${f.data_inicio}|${f.data_fim}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(f);
  }
  let dedupCount = 0;
  const final: FaltaParseada[] = [];
  for (const grupo of groups.values()) {
    if (grupo.length === 1) {
      final.push(grupo[0]);
      continue;
    }
    const seen = new Set<string>();
    const unique: FaltaParseada[] = [];
    for (const f of grupo) {
      const fp = faltaFingerprint(f);
      if (seen.has(fp)) {
        dedupCount++;
        continue;
      }
      seen.add(fp);
      unique.push(f);
    }
    const hasInfo = unique.some((f) => faltaFingerprint(f) !== 'N|');
    const filtered = hasInfo
      ? unique.filter((f) => faltaFingerprint(f) !== 'N|')
      : unique;
    final.push(...filtered);
  }
  if (dedupCount > 0) {
    warnings.push(
      `${dedupCount} falta(s) duplicada(s) (texto idêntico) consolidada(s).`,
    );
  }
  final.sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));

  if (final.length === 0 && unparsed.length === 0) {
    warnings.push(
      'Nenhuma falta detectada automaticamente. Use o formulário para adicionar manualmente.',
    );
  }

  return { faltas: final, warnings, unparsed_lines: unparsed };
}
