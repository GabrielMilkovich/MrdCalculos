/**
 * Gera Blob CSV de Registro de Faltas diretamente do parser.
 *
 * Wrapper sobre buildFaltasCSV (texto) — adiciona Blob + UTF-8.
 *
 * `buildFaltasCSVBlobWithReport` devolve também o BuildReport pra UI mostrar
 * linhas rejeitadas (data inválida, fim<início) e warnings (overlap).
 */

import type { ParseFaltasResult } from '../../parsers/faltas';
import {
  buildFaltasCSV as buildFaltasCsvText,
  buildFaltasCSVWithReport as buildFaltasCsvTextWithReport,
} from '../csv-faltas';
import type { BuildReport } from '../validation';

function paraLinhas(parsed: ParseFaltasResult) {
  return parsed.faltas.map((f) => ({
    data_inicio: f.data_inicio,
    data_fim: f.data_fim,
    justificada: f.justificada,
    reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
    justificativa: f.justificativa,
  }));
}

export function buildFaltasCSVBlob(parsed: ParseFaltasResult): Blob {
  const csv = buildFaltasCsvText(paraLinhas(parsed));
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

export function buildFaltasCSVBlobWithReport(
  parsed: ParseFaltasResult,
): { blob: Blob; report: BuildReport } {
  const { csv, report } = buildFaltasCsvTextWithReport(paraLinhas(parsed));
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    report,
  };
}
