/**
 * Porte 1:1 de DiasDeAbonoValidRule.java (33 linhas).
 *
 * Regra: quantidade de dias de abono não pode exceder 1/3 do prazo total
 * (Art. 143 da CLT). Ex: prazo=30, abono máximo=10.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/ferias/regras/DiasDeAbonoValidRule.java
 */
import Decimal from 'decimal.js';
import type { Ferias } from '../ferias';

export class DiasDeAbonoValidRule {
  static readonly MESSAGE = 'MSG0175';
  private static readonly TERCA_PARTE_DO_PRAZO = new Decimal(3);

  static isValid(diasAbono: number | null, ferias: Ferias): boolean {
    if (diasAbono === null || !ferias.getAbono()) return true;
    // Java: diasAbono - (prazo / 3) <= 0  →  diasAbono <= prazo/3
    const limite = new Decimal(ferias.getPrazo()).div(DiasDeAbonoValidRule.TERCA_PARTE_DO_PRAZO);
    return new Decimal(diasAbono).minus(limite).lte(0);
  }
}
