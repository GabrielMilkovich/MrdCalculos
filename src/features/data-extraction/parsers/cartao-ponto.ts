/**
 * Parser determinístico de Cartão de Ponto.
 *
 * Stateless. Recebe `ocrText` e opcionalmente uma `competencia_referencia`
 * pra filtrar linhas de outros meses. Retorna apurações diárias parseadas +
 * lista de warnings.
 *
 * Pegadinha conhecida (fase 2 se virar problema): OCR pode quebrar uma
 * linha lógica em duas físicas. Quando uma linha tem só horários e a
 * anterior tem data sem horários, considerar a próxima como continuação.
 */

export type Marcacao = { e: string; s: string };

export type OcorrenciaApuracao =
  | "NORMAL"
  | "FALTA"
  | "FERIADO"
  | "FOLGA"
  | "FERIAS"
  | "ATESTADO"
  | "LICENCA_MEDICA";

export type ApuracaoDiaria = {
  data: string; // "yyyy-mm-dd"
  ocorrencia: OcorrenciaApuracao;
  marcacoes: Marcacao[];
  observacao: string | null;
};

export type ParseCartaoPontoResult = {
  apuracoes: ApuracaoDiaria[];
  competencia_predominante: string; // "MM/yyyy"
  data_inicial: string; // "yyyy-mm-dd"
  data_final: string;
  warnings: string[];
};

const RE_DATA = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
const RE_HORA = /\b(\d{1,2}):(\d{2})\b/g;
const RE_OCORRENCIA =
  /\b(FALTA|FERIADO|FOLGA|F[ÉE]RIAS|ATESTADO|LICEN[ÇC]A\s*M[ÉE]DICA)\b/i;

const MAX_MARCACOES = 6;

export function parseCartaoPonto(
  ocrText: string,
  competenciaRef?: string,
): ParseCartaoPontoResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return {
      apuracoes: [],
      competencia_predominante: competenciaRef ?? "",
      data_inicial: "",
      data_final: "",
      warnings: ["OCR vazio"],
    };
  }

  const lines = ocrText.split(/\r?\n/);
  const apuracoes: ApuracaoDiaria[] = [];
  const warnings: string[] = [];
  const competenciaCount = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const dateMatch = line.match(RE_DATA);
    if (!dateMatch) continue;

    const [, dd, mm, yyyy] = dateMatch;
    if (!isValidDate(yyyy, mm, dd)) {
      warnings.push(`Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}`);
      continue;
    }
    const data = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const competencia = `${mm.padStart(2, "0")}/${yyyy}`;
    competenciaCount.set(
      competencia,
      (competenciaCount.get(competencia) ?? 0) + 1,
    );

    // Detecta ocorrência (FALTA, FERIADO, etc.)
    const ocMatch = line.match(RE_OCORRENCIA);
    let ocorrencia: OcorrenciaApuracao = "NORMAL";
    if (ocMatch) {
      const found = ocMatch[1]
        .toUpperCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      if (found.includes("FALTA")) ocorrencia = "FALTA";
      else if (found === "FERIADO") ocorrencia = "FERIADO";
      else if (found === "FOLGA") ocorrencia = "FOLGA";
      else if (found.includes("FERIAS")) ocorrencia = "FERIAS";
      else if (found === "ATESTADO") ocorrencia = "ATESTADO";
      else if (found.includes("LICENCA")) ocorrencia = "LICENCA_MEDICA";
    }

    // Captura horários (descarta inválidos)
    const horarios: string[] = [];
    for (const m of line.matchAll(RE_HORA)) {
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        horarios.push(`${m[1].padStart(2, "0")}:${m[2]}`);
      }
    }

    // Pareia E/S em ordem (descarta horário ímpar com warning)
    const marcacoes: Marcacao[] = [];
    let j = 0;
    while (j + 1 < horarios.length && marcacoes.length < MAX_MARCACOES) {
      marcacoes.push({ e: horarios[j], s: horarios[j + 1] });
      j += 2;
    }
    if (j < horarios.length) {
      warnings.push(
        `Linha ${i + 1} (${data}): número ímpar de horários (${horarios.length}). Última marcação descartada.`,
      );
    }

    // Se ocorrência ≠ NORMAL, descarta marcações
    apuracoes.push({
      data,
      ocorrencia,
      marcacoes: ocorrencia === "NORMAL" ? marcacoes : [],
      observacao: null,
    });
  }

  // Filtra apenas a competência predominante
  const competenciaPredominante = pickPredominant(competenciaCount, competenciaRef);
  const apuracoesFiltradas = apuracoes.filter((a) => {
    const m = a.data.slice(5, 7);
    const y = a.data.slice(0, 4);
    return `${m}/${y}` === competenciaPredominante;
  });

  // Dedup por data (última prevalece)
  const dedup = new Map<string, ApuracaoDiaria>();
  for (const a of apuracoesFiltradas) dedup.set(a.data, a);
  const final = [...dedup.values()].sort((a, b) => a.data.localeCompare(b.data));

  if (final.length === 0) {
    warnings.push("Nenhuma apuração extraída. Verifique se o OCR rodou corretamente.");
  }

  return {
    apuracoes: final,
    competencia_predominante: competenciaPredominante,
    data_inicial: final[0]?.data ?? "",
    data_final: final[final.length - 1]?.data ?? "",
    warnings,
  };
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

function pickPredominant(counts: Map<string, number>, ref?: string): string {
  if (ref && counts.has(ref)) return ref;
  let best = "";
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) {
      best = k;
      max = v;
    }
  }
  return best;
}
