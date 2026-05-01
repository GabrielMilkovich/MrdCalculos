/**
 * Gera Blob CSV de Registro de Faltas diretamente do parser.
 *
 * Wrapper sobre buildFaltasCSV (texto) — adiciona Blob + UTF-8.
 */

import type { ParseFaltasResult } from '../../parsers/faltas';
import { buildFaltasCSV as buildFaltasCsvText } from '../csv-faltas';

export function buildFaltasCSVBlob(parsed: ParseFaltasResult): Blob {
  const csv = buildFaltasCsvText(
    parsed.faltas.map((f) => ({
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      justificada: f.justificada,
      reiniciar_periodo_aquisitivo: f.reiniciar_periodo_aquisitivo,
      justificativa: f.justificativa,
    })),
  );
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
