import type {
  IncidenciaFlags,
  LinhaHistoricoSalarial,
} from '../types';
import { formatBoolBR, formatNumeroBR } from './format-br';

const HEADER =
  'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido';

/**
 * Gera CSV de Histórico Salarial para uma categoria.
 *
 * Toggle "natureza indenizatória" zera todas as 4 flags de incidência,
 * sobrescrevendo o que está em `flags`.
 */
export function buildHistoricoSalarialCSV(
  linhas: LinhaHistoricoSalarial[],
  flags: IncidenciaFlags,
): string {
  const eff = flags.natureza_indenizatoria
    ? { fgts: false, fgtsRec: false, inss: false, inssRec: false }
    : {
        fgts: flags.incide_fgts,
        fgtsRec: flags.fgts_recolhido,
        inss: flags.incide_inss,
        inssRec: flags.inss_recolhido,
      };

  const rows = linhas.map((l) =>
    [
      l.competencia,
      formatNumeroBR(l.valor),
      formatBoolBR(eff.fgts),
      formatBoolBR(eff.fgtsRec),
      formatBoolBR(eff.inss),
      formatBoolBR(eff.inssRec),
    ].join(';'),
  );

  return [HEADER, ...rows].join('\n') + '\n';
}
