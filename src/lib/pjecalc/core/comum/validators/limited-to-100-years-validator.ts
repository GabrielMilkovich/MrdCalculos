/**
 * PJe-Calc v2.15.1 — LimitedTo100YearsValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100YearsValidator
 *
 * Valida se a data não está antes nem depois de 100 anos do "hoje".
 * Equivalente a `Data.isAnteriorACemAnos()` + `Data.isPosteriorACemAnos()`.
 */
import { CustomValidator } from './custom-validator';
import type { LimitedTo100Years_ } from './limited-to-100-years';
import type { ValidatorContext } from './validator-context';

const HUNDRED_YEARS_MS = 100 * 365.25 * 24 * 60 * 60 * 1000;

export class LimitedTo100YearsValidator extends CustomValidator<LimitedTo100Years_> {
  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  isValid(context: ValidatorContext): boolean {
    const value = context.getValue();
    if (value == null) return true;
    if (!(value instanceof Date)) return true;
    const now = Date.now();
    const ts = value.getTime();
    const delta = ts - now;
    return Math.abs(delta) <= HUNDRED_YEARS_MS;
  }
}
