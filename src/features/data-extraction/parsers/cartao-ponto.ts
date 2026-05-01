/**
 * Parser determinístico de Cartão de Ponto.
 *
 * Garantias:
 *   - Nunca descarta linha silenciosamente: tudo que tem dígito + algum padrão
 *     vai parar em `apuracoes` ou em `warnings`/`unparsed_lines`.
 *   - Aceita 3 formatos de data: `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`.
 *   - Aceita hora com ou sem segundos (`HH:MM` ou `HH:MM:SS`).
 *   - Filtro por competência opcional — quando aplica, lista o que foi filtrado.
 *
 * O contrato com a UI é: o usuário vê `apuracoes` na tabela editável + tem
 * acesso a `warnings` (texto humano) + `unparsed_lines` (linhas suspeitas)
 * para conferir manualmente.
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
  data_inicial: string;
  data_final: string;
  warnings: string[];
  /** Linhas do OCR que pareciam ter dado mas não casaram em nenhum padrão. */
  unparsed_lines: Array<{ linha: number; conteudo: string }>;
  /** Apurações filtradas por competência diferente da predominante (não vão pro CSV). */
  apuracoes_filtradas: ApuracaoDiaria[];
};

// Aceita: 01/03/2024, 01-03-2024, 01.03.2024
const RE_DATA = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
// Aceita: 08:00, 8:00, 08:00:30
const RE_HORA = /\b(\d{1,2}):(\d{2})(?::\d{2})?\b/g;
const RE_OCORRENCIA =
  /\b(FALTA|FERIADO|FOLGA|F[ÉE]RIAS|ATESTADO|LICEN[ÇC]A\s*M[ÉE]DICA|AFASTAMENTO)\b/i;
// Linha "tem dado" se contém qualquer dígito (heurística pra unparsed)
const RE_TEM_DIGITO = /\d/;

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
      warnings: ["OCR vazio."],
      unparsed_lines: [],
      apuracoes_filtradas: [],
    };
  }

  const lines = ocrText.split(/\r?\n/);
  const apuracoes: ApuracaoDiaria[] = [];
  const warnings: string[] = [];
  const unparsed: Array<{ linha: number; conteudo: string }> = [];
  const competenciaCount = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (line.length === 0) continue;

    const dateMatch = line.match(RE_DATA);
    if (!dateMatch) {
      // Linha sem data: se tem horário OU palavra-chave, é suspeita.
      const hasHora = /\d{1,2}:\d{2}/.test(line);
      const hasOc = RE_OCORRENCIA.test(line);
      if ((hasHora || hasOc) && RE_TEM_DIGITO.test(line)) {
        unparsed.push({ linha: i + 1, conteudo: line });
      }
      continue;
    }

    const [, dd, mm, yyyy] = dateMatch;
    if (!isValidDate(yyyy, mm, dd)) {
      warnings.push(
        `Linha ${i + 1}: data inválida ${dd}/${mm}/${yyyy}. Linha ignorada.`,
      );
      continue;
    }
    const data = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const competencia = `${mm.padStart(2, "0")}/${yyyy}`;
    competenciaCount.set(
      competencia,
      (competenciaCount.get(competencia) ?? 0) + 1,
    );

    const ocorrencia = detectarOcorrencia(line);
    const horarios = capturarHorarios(line);

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
    if (horarios.length > MAX_MARCACOES * 2) {
      warnings.push(
        `Linha ${i + 1} (${data}): mais de ${MAX_MARCACOES} pares de marcação detectados. Excedente descartado.`,
      );
    }

    apuracoes.push({
      data,
      ocorrencia,
      marcacoes: ocorrencia === "NORMAL" ? marcacoes : [],
      observacao: null,
    });
  }

  // Filtra apenas a competência predominante (se houver) — UI pode reverter.
  const competenciaPredominante = pickPredominant(competenciaCount, competenciaRef);
  const apuracoesPredominantes: ApuracaoDiaria[] = [];
  const apuracoesOutrasCompetencias: ApuracaoDiaria[] = [];
  for (const a of apuracoes) {
    const m = a.data.slice(5, 7);
    const y = a.data.slice(0, 4);
    if (`${m}/${y}` === competenciaPredominante) apuracoesPredominantes.push(a);
    else apuracoesOutrasCompetencias.push(a);
  }
  if (apuracoesOutrasCompetencias.length > 0) {
    warnings.push(
      `${apuracoesOutrasCompetencias.length} apuração(ões) de outra(s) competência(s) foram filtradas. Veja "apuracoes_filtradas" para revisar.`,
    );
  }

  // Dedup por data — última prevalece. Avisa quando dedupa.
  const dedup = new Map<string, ApuracaoDiaria>();
  let dedupCount = 0;
  for (const a of apuracoesPredominantes) {
    if (dedup.has(a.data)) dedupCount++;
    dedup.set(a.data, a);
  }
  if (dedupCount > 0) {
    warnings.push(
      `${dedupCount} apuração(ões) duplicada(s) por data — usada a última de cada dia.`,
    );
  }
  const final = [...dedup.values()].sort((a, b) => a.data.localeCompare(b.data));

  if (final.length === 0 && unparsed.length === 0) {
    warnings.push(
      "Nenhuma apuração extraída. Verifique se o OCR rodou corretamente.",
    );
  }

  return {
    apuracoes: final,
    competencia_predominante: competenciaPredominante,
    data_inicial: final[0]?.data ?? "",
    data_final: final[final.length - 1]?.data ?? "",
    warnings,
    unparsed_lines: unparsed,
    apuracoes_filtradas: apuracoesOutrasCompetencias,
  };
}

function detectarOcorrencia(line: string): OcorrenciaApuracao {
  const m = line.match(RE_OCORRENCIA);
  if (!m) return "NORMAL";
  const found = m[1]
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (found.includes("FALTA")) return "FALTA";
  if (found === "FERIADO") return "FERIADO";
  if (found === "FOLGA") return "FOLGA";
  if (found.includes("FERIAS")) return "FERIAS";
  if (found === "ATESTADO" || found === "AFASTAMENTO") return "ATESTADO";
  if (found.includes("LICENCA")) return "LICENCA_MEDICA";
  return "NORMAL";
}

function capturarHorarios(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(RE_HORA)) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      out.push(`${m[1].padStart(2, "0")}:${m[2]}`);
    }
  }
  return out;
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
