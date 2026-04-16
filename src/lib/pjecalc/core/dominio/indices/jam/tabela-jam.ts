/**
 * PJe-Calc — Tabela JAM (Juros e Atualização Monetária) diária
 *
 * Fonte: CEF (Caixa Econômica Federal).
 * A popular via seed em produção — usada para correção de FGTS (TR + 3% a.a. dia a dia).
 */
export interface EntradaTabelaJAM {
  ano: number;
  mes: number;
  dia: number;
  /** Taxa diária em % */
  taxa: number;
}

export const TABELA_JAM: readonly EntradaTabelaJAM[] = [];
