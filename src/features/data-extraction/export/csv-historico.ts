import type {
  CategoriaIncidenciaConfig,
  LinhaHistoricoSalarial,
} from '../types';
import { formatBoolBR, formatNumeroBR } from './format-br';

const HEADER =
  'Competencia;Valor;IncideFGTS;FGTSRecolhido;IncideINSS;INSSRecolhido';

/**
 * Gera CSV de Histórico Salarial para uma categoria.
 *
 * Toggle "natureza indenizatória" zera todas as 4 flags de incidência,
 * sobrescrevendo o que está em `config`.
 */
export function buildHistoricoSalarialCSV(
  linhas: LinhaHistoricoSalarial[],
  config: CategoriaIncidenciaConfig,
): string {
  const flags = config.natureza_indenizatoria
    ? { fgts: false, fgtsRec: false, inss: false, inssRec: false }
    : {
        fgts: config.incide_fgts,
        fgtsRec: config.fgts_recolhido,
        inss: config.incide_inss,
        inssRec: config.inss_recolhido,
      };

  const rows = linhas.map((l) =>
    [
      l.competencia,
      formatNumeroBR(l.valor),
      formatBoolBR(flags.fgts),
      formatBoolBR(flags.fgtsRec),
      formatBoolBR(flags.inss),
      formatBoolBR(flags.inssRec),
    ].join(';'),
  );

  return [HEADER, ...rows].join('\n') + '\n';
}
