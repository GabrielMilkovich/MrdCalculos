/**
 * Gera Blob CSV de Recibo de Férias diretamente do parser determinístico.
 *
 * Wrapper sobre buildFeriasCSV (texto) — adiciona Blob + UTF-8.
 */

import type { ParseFeriasResult } from '../../parsers/ferias';
import { buildFeriasCSV as buildFeriasCsvText } from '../csv-ferias';

export function buildFeriasCSVBlob(parsed: ParseFeriasResult): Blob {
  const csv = buildFeriasCsvText(
    parsed.ferias.map((f) => ({
      relativa: f.relativa,
      prazo: f.prazo,
      situacao: f.situacao,
      dobra_geral: f.dobra_geral,
      abono: f.abono,
      dias_abono: f.dias_abono,
      gozo1: f.gozo1,
      gozo2: f.gozo2,
      gozo3: f.gozo3,
    })),
  );
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
