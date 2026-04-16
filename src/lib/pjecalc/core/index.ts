/**
 * PJe-Calc Core — Barrel exports
 *
 * Porte 1:1 de PJe-Calc v2.15.1 em TypeScript. Ver MAPPING.md para status detalhado.
 */

// ────────────── base/comum ──────────────
export * from './base/comum/utils';
export { HelperDate, JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST,
         SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER } from './base/comum/helper-date';
export { Periodo } from './base/comum/periodo';

// ────────────── constantes ──────────────
export * from './constantes/enums';

// ────────────── comum ──────────────
export * from './comum/rotinasdecalculo/calculador-de-indices';
export { PeriodoDeJuros } from './comum/periodo-de-juros';

// ────────────── dominio/indices ──────────────
export type { IndiceDeCalculo } from './dominio/indices/indice-de-calculo';
