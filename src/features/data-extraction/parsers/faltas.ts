/**
 * Parser determinístico de Registro de Faltas.
 *
 * Detecta linhas com:
 *   - Intervalo de datas: "10/03/2024 a 12/03/2024"
 *   - Data única: "Falta em 15/03/2024"
 *
 * Heurística pra `justificada`:
 *   - palavras "atestado", "médico", "CID" → true
 *   - "injustificada", "sem justificativa" → false
 *   - default → false
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
};

const RE_INTERVALO_DATA =
  /\b(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até|-|–)\s*(\d{2})\/(\d{2})\/(\d{4})\b/i;
const RE_DATA_UNICA = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
const RE_LINHA_FALTA =
  /\b(?:falta|aus[êe]ncia|n[ãa]o\s*compareceu)\b/i;
const RE_JUSTIFICATIVA = /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2}|licen[çc]a)\b/i;
const RE_INJUSTIFICADA = /\b(injustificada|sem\s+justificativa|n[ãa]o\s+justificada)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

const MAX_JUSTIFICATIVA_LEN = 200;

export function parseFaltas(ocrText: string): ParseFaltasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { faltas: [], warnings: ["OCR vazio"] };
  }

  const lines = ocrText.split(/\r?\n/);
  const faltas: FaltaParseada[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    // Linha tem que ser uma linha de falta (palavra-chave) OU ter padrão claro
    const isFaltaLine = RE_LINHA_FALTA.test(line) || /\bfalt/i.test(line);

    let dataInicio: string | null = null;
    let dataFim: string | null = null;

    const intervaloMatch = line.match(RE_INTERVALO_DATA);
    if (intervaloMatch) {
      const [, dd1, mm1, yyyy1, dd2, mm2, yyyy2] = intervaloMatch;
      if (!isValidDate(yyyy1, mm1, dd1) || !isValidDate(yyyy2, mm2, dd2)) {
        warnings.push(`Linha ${i + 1}: data inválida no intervalo`);
        continue;
      }
      dataInicio = `${yyyy1}-${mm1}-${dd1}`;
      dataFim = `${yyyy2}-${mm2}-${dd2}`;
    } else if (isFaltaLine) {
      const dataMatch = line.match(RE_DATA_UNICA);
      if (!dataMatch) continue;
      const [, dd, mm, yyyy] = dataMatch;
      if (!isValidDate(yyyy, mm, dd)) {
        warnings.push(`Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}`);
        continue;
      }
      dataInicio = `${yyyy}-${mm}-${dd}`;
      dataFim = dataInicio;
    } else {
      continue; // não tem palavra-chave de falta nem intervalo claro
    }

    if (!dataInicio || !dataFim) continue;

    // Justificada?
    let justificada = false;
    if (RE_INJUSTIFICADA.test(line)) {
      justificada = false;
    } else if (RE_JUSTIFICATIVA.test(line)) {
      justificada = true;
    }

    // Reinicia período aquisitivo?
    const reiniciar = RE_REINICIA.test(line);

    // Justificativa: pega trecho relevante (até 200 chars)
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

  // Dedup por (data_inicio, data_fim) — última prevalece
  const dedup = new Map<string, FaltaParseada>();
  for (const f of faltas) dedup.set(`${f.data_inicio}|${f.data_fim}`, f);
  const final = [...dedup.values()].sort((a, b) =>
    a.data_inicio.localeCompare(b.data_inicio),
  );

  if (final.length === 0) {
    warnings.push("Nenhuma falta detectada. Use o formulário manual.");
  }

  return { faltas: final, warnings };
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
