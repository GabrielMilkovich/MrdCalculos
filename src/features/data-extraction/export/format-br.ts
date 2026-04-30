/**
 * Formatação BR para o CSV PJe-Calc Cidadão:
 *   - Decimal: vírgula, sem separador de milhar.
 *   - Booleano: 'S' ou 'N'.
 *   - Data: dd/MM/yyyy (entrada ISO yyyy-mm-dd).
 */

export function formatNumeroBR(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return (0).toFixed(decimals).replace('.', ',');
  return n.toFixed(decimals).replace('.', ',');
}

export function formatBoolBR(b: boolean): 'S' | 'N' {
  return b ? 'S' : 'N';
}

/**
 * "2024-03-15" → "15/03/2024".
 * Aceita também já em "dd/MM/yyyy" (idempotente). Inválido → string vazia.
 */
export function formatDataBR(isoOrBr: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoOrBr)) return isoOrBr;
  const m = isoOrBr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
