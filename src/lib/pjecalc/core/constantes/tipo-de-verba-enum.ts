/**
 * PJe-Calc v2.15.1 — TipoDeVerbaEnum
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.TipoDeVerbaEnum
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/TipoDeVerbaEnum.java
 */

/** Distingue verba principal (P) de reflexa (R). */
export enum TipoDeVerbaEnum {
  PRINCIPAL = 'P',
  REFLEXO = 'R',
}

export const TipoDeVerbaEnumNomes: Record<TipoDeVerbaEnum, string> = {
  [TipoDeVerbaEnum.PRINCIPAL]: 'Principal',
  [TipoDeVerbaEnum.REFLEXO]: 'Reflexa',
};
