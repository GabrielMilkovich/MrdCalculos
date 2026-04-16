/**
 * PJe-Calc v2.15.1 — Informacao
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Informacao
 */
import { MsgValidador } from './msg-validador';

export class Informacao extends MsgValidador {
  private static readonly TIPO = 'INFO';
  isImpeditivo(): boolean { return false; }
  getTipo(): string { return Informacao.TIPO; }
}
