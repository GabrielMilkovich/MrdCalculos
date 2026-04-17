/**
 * PJe-Calc — Tabela TabelaUnicaJTDiario
 *
 * Tabela Única JT Diária (CNJ).
 * A popular via seed em produção.
 */
export interface EntradaTabelaTabelaUnicaJTDiario {
  ano: number;
  mes: number;
  dia: number;
  taxa: number;
}

export const TABELA_UNICA_JT_DIARIO: readonly EntradaTabelaTabelaUnicaJTDiario[] = [];
