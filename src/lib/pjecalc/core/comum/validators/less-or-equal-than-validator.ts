/**
 * PJe-Calc v2.15.1 — LessOrEqualThanValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.LessOrEqualThanValidator
 */
import { HelperDate } from '../../base/comum/helper-date';
import { CustomValidator } from './custom-validator';
import type { LessOrEqualThan_ } from './less-or-equal-than';
import type { ValidatorContext } from './validator-context';

export class LessOrEqualThanValidator extends CustomValidator<LessOrEqualThan_> {
  private static readonly COMPARED_KEY = '1';

  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  getParameter(key: string): unknown {
    if (key === LessOrEqualThanValidator.COMPARED_KEY) return this.spec.value;
    return null;
  }

  isValid(context: ValidatorContext): boolean {
    const value1 = context.getValue();
    const value2 = context.getMemberValue(this.spec.value);
    if (value1 == null || value2 == null) return true;
    if (value1 instanceof Date && value2 instanceof Date) {
      return HelperDate.dateAfterOrEquals(value2, value1);
    }
    return true;
  }
}
