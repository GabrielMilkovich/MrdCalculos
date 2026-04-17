/**
 * PJe-Calc v2.15.1 — ComparedValidator
 * Porte de: br.jus.trt8.pjecalc.negocio.comum.validators.ComparedValidator
 *
 * Compara dois Comparable usando compareTo. No TS, usamos Decimal.compare
 * quando ambos são Decimal; Date comparison via getTime(); strings via
 * localeCompare; caso contrário, igualdade referencial.
 */
import Decimal from 'decimal.js';
import { CustomValidator } from './custom-validator';
import type { Compared_ } from './compared';
import type { ValidatorContext } from './validator-context';

export class ComparedValidator extends CustomValidator<Compared_> {
  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  private getWithObject(): unknown {
    const bean = this.getBean();
    if (bean == null) return null;
    const obj = bean as Record<string, unknown>;
    const getter = `get${this.spec.with.charAt(0).toUpperCase()}${this.spec.with.slice(1)}`;
    const fn = obj[getter];
    if (typeof fn === 'function') return (fn as () => unknown).call(obj);
    return obj[this.spec.with];
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a instanceof Decimal && b instanceof Decimal) return a.comparedTo(b);
    if (a instanceof Date && b instanceof Date) {
      const diff = a.getTime() - b.getTime();
      return diff === 0 ? 0 : diff < 0 ? -1 : 1;
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
    return a === b ? 0 : -1;
  }

  isValid(context: ValidatorContext): boolean {
    const value = context.getValue();
    const withObject = this.getWithObject();
    if (value == null || withObject == null) return true;
    const result = this.compareValues(value, withObject) === this.spec.result;
    return this.spec.not ? !result : result;
  }
}
