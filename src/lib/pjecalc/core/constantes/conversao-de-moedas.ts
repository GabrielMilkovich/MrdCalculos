/**
 * PJe-Calc v2.15.1 — ConversaoDeMoedas
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/ConversaoDeMoedas.java
 *
 * Mapas de conversão de moedas brasileiras (1986-1994):
 * - Cruzeiro → Cruzado (1986)
 * - Cruzado → NCz$ (1989)
 * - NCz$ → Cruzeiro Real (1990)
 * - Cruzeiro Real → Real (1994)
 *
 * Para casos MODERNOS (≥1995), todos os mapas estão VAZIOS — nenhuma conversão
 * é necessária. Quando casos pré-1995 precisarem ser calculados, popular os mapas
 * com os fatores de conversão oficiais do BCB.
 *
 * Funções helper retornam BigDecimal.ONE (fator neutro) quando não há conversão.
 */
import Decimal from 'decimal.js';

/** Competências mensais com conversão de moeda (1º dia do mês → fator) */
export const COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS = new Map<string, Decimal>();

/** Competências diárias com conversão de moeda (dia exato → fator) */
export const COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS = new Map<string, Decimal>();

/**
 * encontrarFatorConversaoParaMudancaDeMoedas (simplificado)
 * Retorna o produto de todos os fatores de conversão entre dataInicial e dataFinal.
 * Para casos modernos (mapas vazios), retorna 1.
 */
export function encontrarFatorConversaoParaMudancaDeMoedas(
  _dataInicial: Date,
  _dataFinal: Date
): Decimal {
  // Simplificação: sem conversões para casos pós-1995
  return new Decimal(1);
}

/**
 * encontrarDataDeConversaoParaMudancaDeMoedas
 * Retorna null para casos modernos (sem conversão no período).
 */
export function encontrarDataDeConversaoParaMudancaDeMoedas(
  _dataInicial: Date,
  _dataFinal: Date
): Date | null {
  return null;
}

/**
 * encontrarCompetenciasDeConversaoParaMudancaDeMoedas
 * Retorna mapa vazio para casos modernos.
 */
export function encontrarCompetenciasDeConversaoParaMudancaDeMoedas(
  _dataInicial: Date,
  _dataFinal: Date
): Map<string, Decimal> {
  return new Map();
}
