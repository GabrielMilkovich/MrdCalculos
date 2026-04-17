/**
 * PJe-Calc — Tabela IndicePrecatorioEstadual
 *
 * Tabela mensal dos juros/correção de precatório estadual (seed externo).
 */
export interface EntradaTabelaPrecatorioEstadual {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_PRECATORIO_ESTADUAL: readonly EntradaTabelaPrecatorioEstadual[] = [];
