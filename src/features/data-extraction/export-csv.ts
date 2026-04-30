/**
 * Builders dos 3 CSVs no formato PJe-Calc Cidadão (TRT-8 v2.5.4+).
 *
 * Cada função retorna string UTF-8 SEM BOM, com \n entre linhas,
 * delimitador `;`, decimal BR (vírgula), booleanos S/N.
 *
 * Linha 1 = header descritivo (parser PJe-Calc descarta a primeira linha
 * mas o header ajuda quem abre o CSV no Excel).
 *
 * Refs:
 *   - AbstractServicoDeParsing.java
 *   - ServicoDeParsingHistoricoSalarial.java
 *   - ServicoDeParsingFerias.java
 *   - ServicoDeParsingFalta.java
 */

import {
  CSV_HEADERS,
  MAX_JUSTIFICATIVA_LEN,
  MAX_RELATIVA_LEN,
} from './constants';
import {
  formatBool,
  formatDecimalBR,
  sanitizeText,
  validateCompetencia,
  validateData,
  validateRelativa,
} from './sanitize';
import type { FaltasRow, FeriasRow, GozoPeriodo, HistoricoSalarialRow } from './types';

/**
 * Histórico Salarial — 6 colunas:
 *   Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido
 *
 * Linhas com competência/valor inválidos são DESCARTADAS (não emite
 * linha branca para evitar erro silencioso no parser).
 */
export function buildHistoricoSalarialCSV(rows: HistoricoSalarialRow[]): string {
  const lines: string[] = [CSV_HEADERS.historico_salarial];
  for (const r of rows) {
    const competencia = validateCompetencia(r.competencia);
    if (!competencia) continue;
    if (!Number.isFinite(r.valor) || r.valor < 0) continue;
    lines.push([
      competencia,
      formatDecimalBR(r.valor),
      formatBool(r.incideFgts),
      formatBool(r.fgtsRecolhido),
      formatBool(r.incideInss),
      formatBool(r.inssRecolhido),
    ].join(';'));
  }
  return lines.join('\n') + '\n';
}

/**
 * Férias — 15 colunas:
 *   Relativa;Prazo;Situacao;DobraGeral;Abono;DiasAbono;
 *   DtIniGozo1;DtFimGozo1;DobraGozo1;
 *   DtIniGozo2;DtFimGozo2;DobraGozo2;
 *   DtIniGozo3;DtFimGozo3;DobraGozo3
 *
 * Quando um período de gozo está ausente, escreve `;;N` (campos vazios
 * + dobra=N). O parser tolera vazios.
 */
export function buildFeriasCSV(rows: FeriasRow[]): string {
  const lines: string[] = [CSV_HEADERS.ferias];
  for (const r of rows) {
    const relativa = sanitizeText(validateRelativa(r.relativa), MAX_RELATIVA_LEN);
    if (!relativa) continue;
    if (!Number.isInteger(r.prazo) || r.prazo < 0 || r.prazo > 90) continue;
    if (!['G', 'GP', 'NG', 'I', 'P'].includes(r.situacao)) continue;
    const diasAbono = Number.isInteger(r.diasAbono) && r.diasAbono >= 0 ? r.diasAbono : 0;
    lines.push([
      relativa,
      String(r.prazo),
      r.situacao,
      formatBool(r.dobraGeral),
      formatBool(r.abono),
      String(diasAbono),
      ...gozoFields(r.gozo1),
      ...gozoFields(r.gozo2),
      ...gozoFields(r.gozo3),
    ].join(';'));
  }
  return lines.join('\n') + '\n';
}

/** Retorna [DtIni, DtFim, Dobra] para um período opcional (3 strings). */
function gozoFields(g: GozoPeriodo | undefined): [string, string, string] {
  if (!g) return ['', '', 'N'];
  const inicio = validateData(g.inicio);
  const fim = validateData(g.fim);
  if (!inicio || !fim) return ['', '', 'N']; // gozo invalido degrada para ausente
  return [inicio, fim, formatBool(g.dobra)];
}

/**
 * Faltas — 5 colunas:
 *   DataInicio;DataFim;Justificada;ReiniciarPeriodoAquisitivo;Justificativa
 *
 * `justificativa` truncada em 200 chars + sem ; \n \r ".
 */
export function buildFaltasCSV(rows: FaltasRow[]): string {
  const lines: string[] = [CSV_HEADERS.faltas];
  for (const r of rows) {
    const dataInicio = validateData(r.dataInicio);
    const dataFim = validateData(r.dataFim);
    if (!dataInicio || !dataFim) continue;
    const justificativa = sanitizeText(r.justificativa ?? '', MAX_JUSTIFICATIVA_LEN);
    lines.push([
      dataInicio,
      dataFim,
      formatBool(r.justificada),
      formatBool(r.reiniciarPeriodoAquisitivo),
      justificativa,
    ].join(';'));
  }
  return lines.join('\n') + '\n';
}

/**
 * Helper: contagem de linhas válidas que cada CSV produzirá (preview
 * antes do download — modal de export).
 */
export function countValidLines(category: 'historico_salarial', rows: HistoricoSalarialRow[]): number;
export function countValidLines(category: 'ferias', rows: FeriasRow[]): number;
export function countValidLines(category: 'faltas', rows: FaltasRow[]): number;
export function countValidLines(
  category: 'historico_salarial' | 'ferias' | 'faltas',
  rows: HistoricoSalarialRow[] | FeriasRow[] | FaltasRow[],
): number {
  const csv =
    category === 'historico_salarial'
      ? buildHistoricoSalarialCSV(rows as HistoricoSalarialRow[])
      : category === 'ferias'
        ? buildFeriasCSV(rows as FeriasRow[])
        : buildFaltasCSV(rows as FaltasRow[]);
  // -1 (header) -1 (newline final)
  return csv.split('\n').length - 2;
}
