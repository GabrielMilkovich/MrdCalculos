/**
 * PJe-Calc — Tabela IGP-M mensal
 *
 * Fonte: FGV.
 * A popular via seed em produção.
 */
export interface EntradaTabelaIGPM {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_IGPM: readonly EntradaTabelaIGPM[] = [];
