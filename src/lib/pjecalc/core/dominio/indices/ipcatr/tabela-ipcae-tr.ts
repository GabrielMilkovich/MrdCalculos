/**
 * PJe-Calc — Tabela IPCAETR
 *
 * IPCA-E/TR combinado (IPCA-E base + TR pós-FGTS).
 * A popular via seed em produção.
 */
export interface EntradaTabelaIPCAETR {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_IPCAETR: readonly EntradaTabelaIPCAETR[] = [];
