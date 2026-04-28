/**
 * PJe-Calc v2.15.1 — Constantes
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.Constantes
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/Constantes.java
 */
import Decimal from 'decimal.js';
import { HelperDate } from './helper-date';

/** Separador em branco (usado em montagens de strings). */
export const STR_ESPACO = ' ';
/** Separador " E " para listas de texto. */
export const STR_E = ' E ';
/** Separador " SOBRE " em fórmulas. */
export const STR_SOBRE = ' SOBRE ';
/** Separador ", " para listas. */
export const STR_VIRGULA = ', ';
/** Separador " - " para ranges. */
export const STR_TRACO = ' - ';

/** Quantidade padrão de aviso prévio em dias (Lei 12.506/2011 — base 30 dias). */
export const QUANTIDADE_PADRAO_AVISO_PREVIO: Decimal = new Decimal('30');

/** Quantidade máxima de históricos salariais aceita pelo engine. */
export const QUANTIDADE_MAXIMA_DE_HISTORICOS = 15;

/**
 * Data limite para aplicação do aviso prévio calculado (proporcional).
 * Lei 12.506/2011: demissões ocorridas a partir desta data usam o cálculo
 * proporcional (3 dias por ano, limitado a 60); anteriores → fixo em 30 dias.
 */
export const DATA_LIMITE_COM_DEMISSAO_PARA_AVISO_PREVIO_CALCULADO: Date =
  HelperDate.getInstance(2011, 9, 13)!.getDate();

/**
 * Data da Reforma Trabalhista (Lei 13.467/2017, vigência 11/11/2017).
 * Usada para bifurcar regras pré/pós reforma (banco de horas, intervalo,
 * acordo individual vs coletivo, etc.).
 */
export const DATA_REFORMA_TRABALHISTA: Date =
  HelperDate.getInstance(2017, 10, 11)!.getDate();

/**
 * Data da Reforma da Previdência (EC 103/2019, vigência 01/03/2020 para
 * maioria das mudanças de alíquota).
 * Usada para bifurcar faixas progressivas de INSS empregado.
 */
export const DATA_REFORMA_PREVIDENCIA: Date =
  HelperDate.getInstance(2020, 2, 1)!.getDate();
