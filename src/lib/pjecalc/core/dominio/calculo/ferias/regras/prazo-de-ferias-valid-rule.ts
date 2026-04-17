/**
 * Porte 1:1 de PrazoDeFeriasValidRule.java (24 linhas).
 *
 * Regra: prazo deve ser >= 0.
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/ferias/regras/PrazoDeFeriasValidRule.java
 */
export class PrazoDeFeriasValidRule {
  static readonly MESSAGE = 'MSG0004';

  static isValid(value: number | null): boolean {
    return value === null || value >= 0;
  }
}
