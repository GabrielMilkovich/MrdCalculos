/**
 * Gera Blob CSV de Recibo de Férias diretamente do parser determinístico.
 *
 * Wrapper sobre buildFeriasCSV (texto) — adiciona Blob + UTF-8.
 *
 * `buildFeriasCSVBlobWithReport` devolve também o `BuildReport` pra a UI
 * mostrar ao operador antes do download (linhas rejeitadas, ajustes, warnings).
 */

import type { ParseFeriasResult } from '../../parsers/ferias';
import {
  buildFeriasCSV as buildFeriasCsvText,
  buildFeriasCSVWithReport as buildFeriasCsvTextWithReport,
} from '../csv-ferias';
import type { BuildReport } from '../validation';

function paraLinhas(parsed: ParseFeriasResult) {
  return parsed.ferias.map((f) => ({
    relativa: f.relativa,
    prazo: f.prazo,
    situacao: f.situacao,
    dobra_geral: f.dobra_geral,
    abono: f.abono,
    dias_abono: f.dias_abono,
    gozo1: f.gozo1,
    gozo2: f.gozo2,
    gozo3: f.gozo3,
  }));
}

export function buildFeriasCSVBlob(parsed: ParseFeriasResult): Blob {
  const csv = buildFeriasCsvText(paraLinhas(parsed));
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

export function buildFeriasCSVBlobWithReport(
  parsed: ParseFeriasResult,
): { blob: Blob; report: BuildReport } {
  const { csv, report } = buildFeriasCsvTextWithReport(paraLinhas(parsed));
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    report,
  };
}
