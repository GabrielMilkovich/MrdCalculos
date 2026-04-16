/**
 * PJe-Calc — Tabela TabelaUnicaJTMensal
 *
 * Tabela Única JT Mensal (CNJ).
 * A popular via seed em produção.
 */
export interface EntradaTabelaTabelaUnicaJTMensal {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_UNICA_JT_MENSAL: readonly EntradaTabelaTabelaUnicaJTMensal[] = [];
