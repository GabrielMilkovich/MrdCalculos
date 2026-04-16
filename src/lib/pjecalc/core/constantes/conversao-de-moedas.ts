/**
 * PJe-Calc v2.15.1 — ConversaoDeMoedas
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/ConversaoDeMoedas.java
 *
 * Mapas de conversão de moedas brasileiras (1967-1994):
 *   1967-02: Cruzeiro antigo → Cruzeiro novo (÷1000)
 *   1986-03: Cruzeiro → Cruzado (÷1000)
 *   1989-01: Cruzado → NCz$ Cruzado Novo (÷1000)
 *   1993-08: Cruzeiro Real → CR$ (÷1000)
 *   1994-07: CR$ → Real (÷2750)
 *
 * Dados portados 1:1 do static initializer Java (linhas 58-73).
 */
import Decimal from 'decimal.js';

function mkKey(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function mkDate(y: number, m0: number, d: number): Date {
  return new Date(y, m0, d, 0, 0, 0, 0);
}

/**
 * Competências MENSAIS (1º dia do mês → fator divisor).
 * Java: HelperDate.getInstance(year, month0, day).getDate()
 */
export const COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS = new Map<string, Decimal>([
  [mkKey(1967, 1, 1),  new Decimal(1000)],   // Fev 1967
  [mkKey(1986, 2, 1),  new Decimal(1000)],   // Mar 1986
  [mkKey(1989, 0, 1),  new Decimal(1000)],   // Jan 1989
  [mkKey(1993, 7, 1),  new Decimal(1000)],   // Ago 1993
  [mkKey(1994, 6, 1),  new Decimal(2750)],   // Jul 1994
]);

/** Competências DIÁRIAS (dia exato da troca → fator divisor) */
export const COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS = new Map<string, Decimal>([
  [mkKey(1967, 1, 13), new Decimal(1000)],   // 13 Fev 1967
  [mkKey(1986, 2, 1),  new Decimal(1000)],   // 01 Mar 1986
  [mkKey(1989, 0, 16), new Decimal(1000)],   // 16 Jan 1989
  [mkKey(1993, 7, 1),  new Decimal(1000)],   // 01 Ago 1993
  [mkKey(1994, 6, 1),  new Decimal(2750)],   // 01 Jul 1994
]);

/** Data da última conversão de moeda (01/07/1994 — Real) */
export function obterDataUltimaConversaoDeMoeda(): Date {
  return mkDate(1994, 6, 1);
}

/**
 * encontrarFatorConversaoParaMudancaDeMoedas (linha 31)
 * Para cada conversão diária cujo Date cai em [inicio, fim], divide fator por divisor.
 */
export function encontrarFatorConversaoParaMudancaDeMoedas(
  inicio: Date,
  fim: Date
): Decimal {
  let fator = new Decimal(1);
  for (const [chave, divisor] of COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS) {
    const [y, m, d] = chave.split('-').map(Number);
    const dataConversao = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (dataConversao.getTime() >= inicio.getTime() && dataConversao.getTime() <= fim.getTime()) {
      fator = fator.div(divisor);
    }
  }
  return fator;
}

/**
 * encontrarDataDeConversaoParaMudancaDeMoedas (linha 40)
 */
export function encontrarDataDeConversaoParaMudancaDeMoedas(
  inicio: Date,
  fim: Date
): Date | null {
  let data: Date | null = null;
  for (const [chave] of COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS) {
    const [y, m, d] = chave.split('-').map(Number);
    const dc = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (dc.getTime() >= inicio.getTime() && dc.getTime() <= fim.getTime()) {
      data = dc;
    }
  }
  return data;
}

/**
 * encontrarCompetenciasDeConversaoParaMudancaDeMoedas (linha 49)
 */
export function encontrarCompetenciasDeConversaoParaMudancaDeMoedas(
  inicio: Date,
  fim: Date
): Map<string, Decimal> {
  const out = new Map<string, Decimal>();
  for (const [chave, divisor] of COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS) {
    const [y, m, d] = chave.split('-').map(Number);
    const dc = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (dc.getTime() >= inicio.getTime() && dc.getTime() <= fim.getTime()) {
      out.set(chave, divisor);
    }
  }
  return out;
}
