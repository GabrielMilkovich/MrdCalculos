/**
 * PJe-Calc — Tabela DevedorNaoFazenda
 *
 * Tabela Devedor não enquadrado como Fazenda Pública (EC 113/2021).
 * A popular via seed em produção.
 */
export interface EntradaTabelaDevedorNaoFazenda {
  ano: number;
  mes: number;
  taxa: number;
}

export const TABELA_DEVEDOR_NAO_FAZENDA: readonly EntradaTabelaDevedorNaoFazenda[] = [];
