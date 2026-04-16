/**
 * PJe-Calc — Tabela SELIC Fazenda (mensal, idêntica à SELIC RFB)
 * A popular via seed em produção.
 */
export interface EntradaTabelaSelicFazenda {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_SELIC_FAZENDA: readonly EntradaTabelaSelicFazenda[] = [];
