/**
 * PJe-Calc — Tabela INPC mensal
 *
 * Fonte: IBGE série 1736 (INPC, publicado mensalmente).
 * A popular via seed em produção.
 */
export interface EntradaTabelaINPC {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_INPC: readonly EntradaTabelaINPC[] = [];
