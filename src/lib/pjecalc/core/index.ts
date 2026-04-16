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
export { IndiceBase } from './dominio/indices/indice-base';
export { IndiceIPCAE } from './dominio/indices/ipcae/indice-ipcae';
export { TABELA_IPCAE } from './dominio/indices/ipcae/tabela-ipcae';
export type { EntradaTabelaIPCAE } from './dominio/indices/ipcae/tabela-ipcae';

// ────────────── dominio/ocorrenciaverba ──────────────
export {
  OcorrenciaDeVerba,
  ATRIBUTO_QUANTIDADE,
  ATRIBUTO_PAGO,
  ATRIBUTO_DEVIDO,
} from './dominio/ocorrenciaverba/ocorrencia-de-verba';
export type { IVerbaDeCalculoRef, IFeriasRef } from './dominio/ocorrenciaverba/ocorrencia-de-verba';
