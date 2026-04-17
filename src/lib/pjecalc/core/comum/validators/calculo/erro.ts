/**
 * PJe-Calc v2.15.1 — Erro
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Erro
 */
import { MsgValidador } from './msg-validador';

export class Erro extends MsgValidador {
  private static readonly TIPO = 'ERRO';
  isImpeditivo(): boolean { return true; }
  getTipo(): string { return Erro.TIPO; }
}
