/**
 * PJe-Calc — Tabela IndebitoTributario
 *
 * Tabela de Repetição de Indébito Tributário.
 * A popular via seed em produção.
 */
export interface EntradaTabelaIndebitoTributario {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_INDEBITO_TRIBUTARIO: readonly EntradaTabelaIndebitoTributario[] = [];
