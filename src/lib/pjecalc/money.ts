/**
 * Helpers de valor monetário (Decimal.js) — CLAUDE.md proíbe `number`/parseFloat
 * para valores sensíveis. Centralizado p/ reuso pelas telas de input (Histórico
 * Salarial, Pagamentos, etc.).
 */
import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

/**
 * Converte string de input (pt-BR ou en) → Decimal. Aceita "1.234,56",
 * "1234,56", "1234.56", "1234". Lança se não-numérico.
 */
export function parseDecimalInput(v: string | number | null | undefined): Decimal {
  if (v == null || v === "") throw new Error("valor vazio");
  if (typeof v === "number") return new Decimal(v);
  const s = v.trim();
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return new Decimal(normalized);
}

/**
 * Parse "tolerante" para edição de célula: retorna número com 2 casas ou
 * `fallback` (default 0) se inválido/vazio. NUNCA usa parseFloat.
 * O retorno é `number` apenas porque é a fronteira de persistência (coluna
 * numeric); o cálculo monetário no engine usa Decimal internamente.
 */
export function toMoneyNumber(v: string | number | null | undefined, fallback = 0): number {
  try {
    return parseDecimalInput(v).toDecimalPlaces(2).toNumber();
  } catch {
    return fallback;
  }
}

/** true se o valor é monetário válido e ≥ 0. Vazio = inválido. */
export function isValidMoney(v: string | number | null | undefined): boolean {
  try {
    return !parseDecimalInput(v).isNegative();
  } catch {
    return false;
  }
}
