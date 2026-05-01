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

/** Helpers de formato BR. */
export function parseBR(s: string): number {
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
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
