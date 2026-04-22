/**
 * PJe-Calc v2.15.1 — TipoFeriadoEnum
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.TipoFeriadoEnum
 *
 * Usado no cadastro de feriados (Tabela Feriado) e na apuração de
 * cartão de ponto para classificar dias não-úteis.
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/TipoFeriadoEnum.java
 */

export enum TipoFeriadoEnum {
  FERIADO = 'F',
  PONTO_FACULTATIVO = 'P',
  /** Feriado exclusivamente bancário (não afeta trabalhista comum). */
  BANCARIO = 'B',
}

export const TipoFeriadoEnumNomes: Record<TipoFeriadoEnum, string> = {
  [TipoFeriadoEnum.FERIADO]: 'Feriado',
  [TipoFeriadoEnum.PONTO_FACULTATIVO]: 'Ponto Facultativo',
  [TipoFeriadoEnum.BANCARIO]: 'Feriado Exclusivamente Bancário',
};
