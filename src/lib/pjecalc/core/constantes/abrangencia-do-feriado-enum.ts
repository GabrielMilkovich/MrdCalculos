/**
 * PJe-Calc v2.15.1 — AbrangenciaDoFeriadoEnum
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.AbrangenciaDoFeriadoEnum
 *
 * Esfera do feriado: nacional (Lei 662/1949), estadual (leis estaduais)
 * ou municipal (leis municipais). Afeta a aplicabilidade ao caso
 * conforme a localidade do reclamante.
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/AbrangenciaDoFeriadoEnum.java
 */

export enum AbrangenciaDoFeriadoEnum {
  /** Nacional (Lei 662/1949 + Lei 6.802/1980 — Padroeira do Brasil etc). */
  FEDERAL = 'F',
  ESTADUAL = 'E',
  MUNICIPAL = 'M',
}

export const AbrangenciaDoFeriadoEnumNomes: Record<AbrangenciaDoFeriadoEnum, string> = {
  [AbrangenciaDoFeriadoEnum.FEDERAL]: 'Nacional',
  [AbrangenciaDoFeriadoEnum.ESTADUAL]: 'Estadual',
  [AbrangenciaDoFeriadoEnum.MUNICIPAL]: 'Municipal',
};
