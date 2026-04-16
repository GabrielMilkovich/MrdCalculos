/**
 * PJe-Calc — Tabela TabelaUnicaDebitoTrabalhista
 *
 * Tabela Única de Débito Trabalhista (TUACDT).
 * A popular via seed em produção.
 */
export interface EntradaTabelaTabelaUnicaDebitoTrabalhista {
  ano: number;
  mes: number;
  dia: number;
  taxa: number;
}

export const TABELA_UNICA_DEBITO_TRABALHISTA: readonly EntradaTabelaTabelaUnicaDebitoTrabalhista[] = [];
