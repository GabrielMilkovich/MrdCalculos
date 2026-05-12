/**
 * Tipos compartilhados pela biblioteca de layouts de holerite.
 */

export type RubricaParseada = {
  codigo: string | null;
  nome: string;
  valor_vencimento: number | null;
  valor_desconto: number | null;
  quantidade: number | null;
  ordem: number;
};

export type HoleriteParseResult = {
  competencia: string; // "MM/yyyy"
  rubricas: RubricaParseada[];
  layout_usado: string;
  warnings: string[];
};

export interface LayoutHolerite {
  /** Slug curto (ex: 'via_varejo_v1', 'generico_v1'). */
  slug: string;
  /** Nome legível (ex: 'Via Varejo (Casas Bahia)'). */
  nome: string;
  /** Sinais que identificam o layout. TODOS devem casar pra escolher esse parser. */
  sinaisIdentificacao: RegExp[];
  /** Parser específico. Retorna null se não conseguir extrair (rare). */
  parse(ocrText: string): HoleriteParseResult | null;
}

/**
 * Helpers de formato BR.
 *
 * AUDIT #5: `parseFloat` introduzia erosão de precisão em centavos
 * (ex.: 0.1 + 0.2 = 0.30000000000000004). CLAUDE.md proíbe `number`
 * para valores monetários — usamos `Decimal.js` na parse e devolvemos
 * `number` com toFixed(2) para manter a API pública estável. Cálculos
 * downstream (csv-historico, engine V3) seguem convertendo para Decimal
 * de novo, mas o ponto de entrada já vem alinhado.
 */
import Decimal from "decimal.js";

export function parseBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  try {
    const d = new Decimal(cleaned);
    // Cap em 2 casas decimais para valores monetários (R$ sempre 0..0,99).
    return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  } catch {
    return 0;
  }
}

/**
 * Versão estrita: devolve Decimal direto, sem perda de precisão.
 * Preferir em código novo que vai usar o valor em soma/produto. A API
 * `parseBR(s): number` permanece pelo compromisso com 1500+ chamadas
 * existentes.
 */
export function parseBRDecimal(s: string): Decimal {
  if (!s) return new Decimal(0);
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  try {
    return new Decimal(cleaned);
  } catch {
    return new Decimal(0);
  }
}

export const MESES_PT: Record<string, string> = {
  JAN: "01",
  FEV: "02",
  MAR: "03",
  ABR: "04",
  MAI: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SET: "09",
  OUT: "10",
  NOV: "11",
  DEZ: "12",
};
