/**
 * PJe-Calc — Tabela SELIC diária (BCB)
 *
 * Fonte: BCB série 11 (SELIC diária).
 * A popular via seed em produção — usada em SELIC_BACEN (juros compostos).
 */
export interface EntradaTabelaSelicDiaria {
  ano: number;
  mes: number;
  dia: number;
  /** Taxa diária em % */
  taxa: number;
}

export const TABELA_SELIC_DIARIA: readonly EntradaTabelaSelicDiaria[] = [];
