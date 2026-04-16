/**
 * PJe-Calc — Tabela IPC mensal (IPC-FIPE)
 *
 * Fonte: FIPE.
 * A popular via seed em produção.
 */
export interface EntradaTabelaIPC {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_IPC: readonly EntradaTabelaIPC[] = [];
