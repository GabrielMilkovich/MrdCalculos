/**
 * Parser do CSV canônico de jornada (formato manual de import).
 *
 *   data;ocorrencia;e1;s1;e2;s2;e3;s3;observacao
 *
 * Função pura — extraída do dialog para facilitar testes sem mount React.
 */
import type {
  ApuracaoDiaria,
  Marcacao,
  OcorrenciaApuracao,
} from "@/features/data-extraction";

const VALID_OCORRENCIAS: OcorrenciaApuracao[] = [
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
];

export const CSV_HEADER = "data;ocorrencia;e1;s1;e2;s2;e3;s3;observacao";

export function parseCsvToApuracoes(csv: string): ApuracaoDiaria[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  let start = 0;
  const firstField = lines[0].split(";")[0]?.trim().toLowerCase();
  if (firstField === "data") start = 1;

  const out: ApuracaoDiaria[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(";").map((s) => s.trim());
    if (cols.length < 2) continue;
    const data = cols[0];
    const ocorrenciaRaw = (cols[1] ?? "").toUpperCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error(`Linha ${i + 1}: data inválida "${data}" (use yyyy-mm-dd)`);
    }
    const ocorrencia: OcorrenciaApuracao = (
      VALID_OCORRENCIAS as readonly string[]
    ).includes(ocorrenciaRaw)
      ? (ocorrenciaRaw as OcorrenciaApuracao)
      : "NORMAL";

    const marcacoes: Marcacao[] = [];
    for (let p = 0; p < 3; p++) {
      const e = cols[2 + p * 2] ?? "";
      const s = cols[3 + p * 2] ?? "";
      if (e || s) marcacoes.push({ e, s });
    }
    const observacao = cols[8] ?? null;

    out.push({
      data,
      ocorrencia,
      marcacoes,
      observacao: observacao && observacao.length > 0 ? observacao : null,
    });
  }

  return out;
}
