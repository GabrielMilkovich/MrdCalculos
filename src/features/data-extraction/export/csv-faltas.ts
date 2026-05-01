/**
 * CSV de Faltas — formato oficial PJe-Calc Cidadão.
 *
 * Validado byte-a-byte contra modelo oficial:
 *   modelo de exemplo csv/ExemploFaltas.csv
 *
 * Spec do parser:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFaltas.java
 *
 * Características obrigatórias:
 *   - Header LITERAL exato (5 colunas com aspas duplas):
 *       "INICIO";"FIM";"JUSTIFICADA";"REINICIAR_PER_AQ";"JUSTIFICATIVA"
 *   - Aspas duplas em cada célula.
 *   - Justificativa pode ser célula vazia (linha 4 do exemplo oficial:
 *       "23/12/2018";"23/12/2018";"N";"N";   ← último ; sem aspas porque vazio
 *     ou seja: trailing `;` mesmo sem conteúdo, sem aspas).
 *   - Encoding UTF-8.
 *   - Datas `dd/MM/yyyy`.
 *   - Boolean `S` / `N`.
 *   - Justificativa max 200 chars.
 *   - Line ending CRLF.
 */
import { formatBoolBR, formatDataBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  '"INICIO";"FIM";"JUSTIFICADA";"REINICIAR_PER_AQ";"JUSTIFICATIVA"';
const CRLF = '\r\n';
const MAX_JUSTIFICATIVA = 200;

export type FaltaCsvLinha = {
  data_inicio: string; // ISO yyyy-mm-dd
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
};

function q(s: string): string {
  return `"${s}"`;
}

export function buildFaltasCSV(linhas: FaltaCsvLinha[]): string {
  const rows = linhas.map((f) => {
    const justRaw = sanitizeText(f.justificativa, MAX_JUSTIFICATIVA);
    // Coluna justificativa: aspas só quando há conteúdo (alinha com modelo oficial)
    const justCell = justRaw.length > 0 ? q(justRaw) : '';
    return [
      q(formatDataBR(f.data_inicio)),
      q(formatDataBR(f.data_fim)),
      q(formatBoolBR(f.justificada)),
      q(formatBoolBR(f.reiniciar_periodo_aquisitivo)),
      justCell,
    ].join(';');
  });
  return [HEADER, ...rows].join(CRLF) + CRLF;
}
