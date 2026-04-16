/**
 * PJe-Calc v2.15.1 — MinValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.MinValidator
 */
import Decimal from 'decimal.js';
import { CustomValidator } from './custom-validator';
import type { Min_ } from './min';
import type { ValidatorContext } from './validator-context';

export class MinValidator extends CustomValidator<Min_> {
  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  isValid(context: ValidatorContext): boolean {
    const value = context.getValue();
    if (value === null || value === undefined) return true;
    const min = new Decimal(this.spec.value);
    if (typeof value === 'string') {
      try {
        return new Decimal(value).greaterThanOrEqualTo(min.floor());
      } catch {
        return false;
      }
    }
    if (value instanceof Decimal) {
      return value.greaterThanOrEqualTo(min);
    }
    if (typeof value === 'number') {
      return value >= min.toNumber();
    }
    if (typeof value === 'bigint') {
      return value >= BigInt(min.floor().toString());
    }
    return false;
  }
}
