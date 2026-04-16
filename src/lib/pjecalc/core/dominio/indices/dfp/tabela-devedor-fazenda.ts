/**
 * PJe-Calc — Tabela DevedorFazenda
 *
 * Tabela Devedor Fazenda Pública (EC 113/2021 + Lei 9.430/96).
 * A popular via seed em produção.
 */
export interface EntradaTabelaDevedorFazenda {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_DEVEDOR_FAZENDA: readonly EntradaTabelaDevedorFazenda[] = [];
