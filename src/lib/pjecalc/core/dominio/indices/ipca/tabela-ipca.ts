/**
 * PJe-Calc — Tabela IPCA mensal
 *
 * Fonte: IBGE série 1737 (IPCA, publicado mensalmente).
 *
 * ATENÇÃO: Esta tabela está vazia por padrão. Em produção, popular via
 * script de atualização (scripts/update-indices.ts) ou seed do banco.
 * Quando vazia, o engine emite warning ao tentar correção IPCA.
 */
export interface EntradaTabelaIPCA {
  ano: number;
  /** 1-indexed (1 = Janeiro) */
  mes: number;
  /** Taxa mensal em % */
  taxa: number;
}

export const TABELA_IPCA: readonly EntradaTabelaIPCA[] = [];
