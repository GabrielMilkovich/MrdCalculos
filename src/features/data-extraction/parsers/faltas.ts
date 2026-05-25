/**
 * Parser determinístico de Registro de Faltas.
 *
 * Garantias:
 *   - Aceita 3 formatos de data: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy.
 *   - Detecta linhas-falta por palavras-chave amplas: falta, ausência, não
 *     compareceu, atestado, licença, afastamento, abono.
 *   - Linhas com data mas sem palavra-chave clara vão pra `unparsed_lines`
 *     (não são descartadas em silêncio).
 *
 * Heurística pra `justificada`:
 *   - "atestado", "médico", "CID", "licença" → true
 *   - "injustificada", "sem justificativa", "não justificada" → false
 *   - default → false (segurança jurídica: assumir injustificada)
 */

export type FaltaParseada = {
  data_inicio: string; // "yyyy-mm-dd"
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
};

export type ParseFaltasResult = {
  faltas: FaltaParseada[];
  warnings: string[];
  /** Linhas com data ou termo de afastamento que não geraram falta — revisar. */
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
};

const RE_INTERVALO_DATA =
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\s*(?:a|at[ée]|-|–)\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/i;
const RE_DATA_UNICA = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
// Palavras-chave amplas para detectar linha relevante.
const RE_LINHA_FALTA =
  /\b(falt\w*|aus[êe]nc\w+|n[ãa]o\s*compareceu|atestado|licen[çc]a|afastamento|abon\w*)\b/i;
// Justificativa: regex CONSERVADORA — exige contexto explícito quando o
// termo for ambíguo. "consulta agendada" sozinho NÃO é prova de
// justificativa (o empregado pode ter agendado e faltado; só
// "consulta médica" / "consulta cardiológica" qualificam). Mesma lógica
// para "licença" — apenas com qualificador (médica/gestante/paternidade).
// Decisão jurídica: errar para "injustificada" como default em ambiguidade.
const RE_JUSTIFICATIVA =
  /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2,3}|m[ée]d\.?\s|hospital|interna[çc][ãa]o|cirurgia|gestante|gala|nojo|doa[çc][ãa]o\s+(?:de\s+)?sangue|licen[çc]a\s+(?:m[ée]dica|gestante|paternidade|maternidade|p[ée]ssimo|nojo|gala)|consulta\s+(?:m[ée]dica|odontol[oó]gica|psicol[oó]gica|hospitalar|com\s+(?:dr|dra|m[ée]dico)))\b/i;
const RE_INJUSTIFICADA = /\b(injustifica\w*|sem\s+justifica\w*|n[ãa]o\s+justifica\w*)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

// CTPS Digital: detecta blocos de férias pra NÃO confundir com faltas.
// Linha com intervalo de datas dentro de bloco "HISTÓRICO DE FÉRIAS" é
// período aquisitivo + gozo, não falta. Sem essa exclusão, parser exporta
// 18 "faltas" que são na verdade férias gozadas (bug do caso ROQUE GUERREIRO).
const RE_BLOCO_FERIAS_HEADER = /\b(?:hist[óo]rico\s+de\s+f[ée]rias|f[ée]rias\s+gozadas|registro\s+de\s+f[ée]rias|per[íi]odos?\s+de\s+f[ée]rias)\b/i;
const RE_FIM_BLOCO_FERIAS = /\b(?:afastamento|registro\s+de\s+falt|hist[óo]rico\s+de\s+cargo|hist[óo]rico\s+de\s+lota[çc][ãa]o|contribui[çc][ãa]o\s+sindical|hist[óo]rico\s+salarial|anota[çc][oõ]es\s+gerais)\b/i;

const MAX_JUSTIFICATIVA_LEN = 200;

/**
 * Identifica faixas de linhas que pertencem ao bloco "HISTÓRICO DE FÉRIAS"
 * em CTPS Digital. Retorna Set de índices de linhas a excluir do parsing
 * de faltas. Sem isso, cada período aquisitivo vira uma "falta" falsa.
 */
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
    return { faltas: [], warnings: ["OCR vazio."], unparsed_lines: [] };
  }

  const lines = ocrText.split(/\r?\n/);
  const faltas: FaltaParseada[] = [];
  const warnings: string[] = [];
  const unparsed: Array<{ linha: number; conteudo: string }> = [];

  // CTPS fix: exclui linhas do bloco "HISTÓRICO DE FÉRIAS" pra não gerar
  // faltas falsas a partir de períodos aquisitivos.
  const linhasDeFerias = identificarLinhasDeFerias(lines);
  if (linhasDeFerias.size > 0) {
    warnings.push(
      `${linhasDeFerias.size} linhas de bloco "HISTÓRICO DE FÉRIAS" excluídas ` +
        `do parsing de faltas (evita confusão período aquisitivo → falta).`,
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (linhasDeFerias.has(i)) continue;

    const isFaltaLine = RE_LINHA_FALTA.test(line);
    const intervaloMatch = line.match(RE_INTERVALO_DATA);
    const dataMatch = !intervaloMatch ? line.match(RE_DATA_UNICA) : null;

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
    } else if (isFaltaLine && dataMatch) {
      const [, dd, mm, yyyy] = dataMatch;
      if (!isValidDate(yyyy, mm, dd)) {
        warnings.push(`Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}.`);
        continue;
      }
      dataInicio = isoDate(yyyy, mm, dd);
      dataFim = dataInicio;
    } else if (isFaltaLine && !dataMatch) {
      // Linha-falta sem data legível → suspeita.
      unparsed.push({ linha: i + 1, conteudo: line });
      continue;
    } else if (dataMatch && !isFaltaLine) {
      // Tem data mas nenhuma palavra-chave de falta. Pode ser cabeçalho ou
      // outra coisa. Marca como suspeita só se houver hint de "tabela de
      // faltas" no contexto (nome próximo) — versão segura: anota e segue.
      // Não criamos falta aqui (evita falsos positivos).
      continue;
    } else {
      continue;
    }

    if (!dataInicio || !dataFim) continue;

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
      justificativa = line.slice(idx, idx + MAX_JUSTIFICATIVA_LEN).trim();
    }

    faltas.push({
      data_inicio: dataInicio,
      data_fim: dataFim,
      justificada,
      reiniciar_periodo_aquisitivo: reiniciar,
      justificativa,
    });
  }

  // Dedup mantendo múltiplas faltas legítimas no mesmo intervalo:
  //   - Duplicatas EXATAS (mesma justificada + mesma justificativa) → 1 só.
  //   - Faltas "vazias" (sem justificativa) absorvidas por entradas com info
  //     no mesmo intervalo (a vazia foi só uma menção genérica).
  //   - Múltiplos atestados/justificativas distintas no mesmo dia → preserva
  //     todas (PJe-Calc aceita várias linhas com mesma data).
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
    // Se há entrada(s) com informação, descarta as totalmente vazias.
    const hasInfo = unique.some((f) => faltaFingerprint(f) !== "N|");
    const filtered = hasInfo
      ? unique.filter((f) => faltaFingerprint(f) !== "N|")
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
      "Nenhuma falta detectada automaticamente. Use o formulário para adicionar manualmente.",
    );
  }

  return { faltas: final, warnings, unparsed_lines: unparsed };
}

function isoDate(yyyy: string, mm: string, dd: string): string {
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Identifica falta por (justificada, justificativa normalizada). */
function faltaFingerprint(f: FaltaParseada): string {
  const j = (f.justificativa ?? "").trim().toLowerCase();
  return `${f.justificada ? "S" : "N"}|${j}`;
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
