/**
 * PJe-Calc v2.15.1 — RequiredValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.RequiredValidator
 */
import { CustomValidator } from './custom-validator';
import type { Required_ } from './required';
import type { ValidatorContext } from './validator-context';

export class RequiredValidator extends CustomValidator<Required_> {
  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  isValid(context: ValidatorContext): boolean {
    const value = context.getValue();
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Map) return value.size > 0;
    if (value instanceof Set) return value.size > 0;
    return String(value) !== '';
  }
}
