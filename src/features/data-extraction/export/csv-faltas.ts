import { formatBoolBR, formatDataBR } from './format-br';
import { sanitizeText } from './sanitize';

const HEADER =
  'DataInicio;DataFim;Justificada;ReiniciarPeriodoAquisitivo;Justificativa';

const MAX_JUSTIFICATIVA = 200;

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
  return [HEADER, ...rows].join('\n') + '\n';
}
