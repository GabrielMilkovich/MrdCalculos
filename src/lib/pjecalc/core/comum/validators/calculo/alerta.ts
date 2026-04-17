/**
 * PJe-Calc v2.15.1 — Alerta
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Alerta
 */
import { MsgValidador } from './msg-validador';

export class Alerta extends MsgValidador {
  private static readonly TIPO = 'ALERTA';
  isImpeditivo(): boolean { return false; }
  getTipo(): string { return Alerta.TIPO; }
}
