/**
 * Formatação BR para o CSV PJe-Calc Cidadão:
 *   - Decimal: vírgula, sem separador de milhar.
 *   - Booleano: 'S' ou 'N'.
 *   - Data: dd/MM/yyyy (entrada ISO yyyy-mm-dd).
 *
 * IMPORTANTE: aceita `Decimal` do decimal.js OU `number`. Para valores
 * que vão para o CSV (rubricas, somas, valores monetários) PREFIRA SEMPRE
 * `Decimal` — `number` é tolerado apenas para retro-compatibilidade.
 * Esta camada não promove `number` em `Decimal` automaticamente nem faz
 * arredondamento bancário; cabe ao chamador agregar com Decimal antes.
 */
import Decimal from 'decimal.js';
import { dataIsoToBr, isDataBRValida } from './validation';

export function formatNumeroBR(n: Decimal | number, decimals = 2): string {
  if (n instanceof Decimal) {
    if (!n.isFinite()) return (0).toFixed(decimals).replace('.', ',');
    return n.toFixed(decimals).replace('.', ',');
  }
  if (!Number.isFinite(n)) return (0).toFixed(decimals).replace('.', ',');
  return n.toFixed(decimals).replace('.', ',');
}

export function formatBoolBR(b: boolean): 'S' | 'N' {
  return b ? 'S' : 'N';
}

/**
 * "2024-03-15" → "15/03/2024".
 * Aceita também já em "dd/MM/yyyy" (idempotente). Inválido → string vazia.
 *
 * VALIDA semanticamente: 2024-13-45 → "" (não tenta produzir lixo).
 */
export function formatDataBR(isoOrBr: string): string {
  if (isDataBRValida(isoOrBr)) return isoOrBr;
  const out = dataIsoToBr(isoOrBr);
  return out ?? '';
}
