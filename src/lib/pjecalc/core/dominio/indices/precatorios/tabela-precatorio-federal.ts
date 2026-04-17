/**
 * PJe-Calc — Tabela IndicePrecatorioFederal
 *
 * Tabela mensal dos juros/correção de precatório federal (seed externo).
 */
export interface EntradaTabelaPrecatorioFederal {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_PRECATORIO_FEDERAL: readonly EntradaTabelaPrecatorioFederal[] = [];
