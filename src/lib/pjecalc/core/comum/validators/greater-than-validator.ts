/**
 * PJe-Calc v2.15.1 — GreaterThanValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.GreaterThanValidator
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { CustomValidator } from './custom-validator';
import type { GreaterThan_ } from './greater-than';
import type { ValidatorContext } from './validator-context';

export class GreaterThanValidator extends CustomValidator<GreaterThan_> {
  private static readonly COMPARED_KEY = '1';

  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  getParameter(key: string): unknown {
    if (key === GreaterThanValidator.COMPARED_KEY) return this.spec.value;
    return null;
  }

  isValid(context: ValidatorContext): boolean {
    const value1 = context.getValue();
    const value2 = context.getMemberValue(this.spec.value);
    if (value1 == null || value2 == null) return true;
    if (value1 instanceof Date && value2 instanceof Date) {
      return HelperDate.dateBefore(value2, value1);
    }
    if (value1 instanceof Decimal && value2 instanceof Decimal) {
      return value1.greaterThan(value2);
    }
    return true;
  }
}
