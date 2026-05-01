/**
 * CSV de Faltas — formato aceito por PJe-Calc 2.15.1.
 *
 * Spec confirmada via decompilação do JAR oficial:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFaltas.java
 *
 * Características obrigatórias:
 *   - 4 OU 5 colunas (justificativa é opcional).
 *   - Encoding UTF-8.
 *   - Delimitador `;`.
 *   - Boolean `S` / `N`.
 *   - Datas `dd/MM/yyyy`.
 *   - Línea 0 é header (descarta).
 *
 * Campos:
 *   1. dataInicio                  (dd/MM/yyyy)
 *   2. dataFim                     (dd/MM/yyyy)
 *   3. justificada                 (S/N)
 *   4. reiniciarPeriodoAquisitivo  (S/N)
 *   5. justificativa               (texto, opcional, max 200 chars — código:
 *                                    `if (split.length > 4)` + `limitarTamanhoTexto(..., 200)`)
 */
import { formatBoolBR, formatDataBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  'DataInicio;DataFim;Justificada;ReiniciarPeriodoAquisitivo;Justificativa';
const CRLF = '\r\n';
const MAX_JUSTIFICATIVA = 200; // confirmado no parser Java

export type FaltaCsvLinha = {
  data_inicio: string; // ISO yyyy-mm-dd
  data_fim: string;
  justificada: boolean;
  reiniciar_periodo_aquisitivo: boolean;
  justificativa: string | null;
};

export function buildFaltasCSV(linhas: FaltaCsvLinha[]): string {
  const rows = linhas.map((f) =>
    [
      formatDataBR(f.data_inicio),
      formatDataBR(f.data_fim),
      formatBoolBR(f.justificada),
      formatBoolBR(f.reiniciar_periodo_aquisitivo),
      sanitizeText(f.justificativa, MAX_JUSTIFICATIVA),
    ].join(';'),
  );
  return [HEADER, ...rows].join(CRLF) + CRLF;
}
