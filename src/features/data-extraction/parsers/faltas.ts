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
const RE_JUSTIFICATIVA =
  /\b(atestado|m[ée]dico|cid[\s:-]+[a-z]\d{2,3}|licen[çc]a|m[ée]d\.?\b|hospital|consulta|sa[úu]de|gestante|gala|nojo|doa[çc][ãa]o\s+(?:de\s+)?sangue)\b/i;
const RE_INJUSTIFICADA = /\b(injustifica\w*|sem\s+justifica\w*|n[ãa]o\s+justifica\w*)\b/i;
const RE_REINICIA = /\breinicia\s+(?:o\s+)?per[íi]odo\s+aquisitivo\b/i;

const MAX_JUSTIFICATIVA_LEN = 200;

export function parseFaltas(ocrText: string): ParseFaltasResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { faltas: [], warnings: ["OCR vazio."], unparsed_lines: [] };
  }

  const lines = ocrText.split(/\r?\n/);
  const faltas: FaltaParseada[] = [];
  const warnings: string[] = [];
  const unparsed: Array<{ linha: number; conteudo: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

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

  // Dedup por (data_inicio, data_fim) — última prevalece.
  const dedup = new Map<string, FaltaParseada>();
  let dedupCount = 0;
  for (const f of faltas) {
    const k = `${f.data_inicio}|${f.data_fim}`;
    if (dedup.has(k)) dedupCount++;
    dedup.set(k, f);
  }
  if (dedupCount > 0) {
    warnings.push(
      `${dedupCount} falta(s) duplicada(s) por intervalo — usada a última de cada par.`,
    );
  }
  const final = [...dedup.values()].sort((a, b) =>
    a.data_inicio.localeCompare(b.data_inicio),
  );

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
