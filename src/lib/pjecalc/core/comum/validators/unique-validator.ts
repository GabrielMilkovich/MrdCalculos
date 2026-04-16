/**
 * PJe-Calc v2.15.1 — UniqueValidator
 * Porte TS-adaptado de: br.jus.trt8.pjecalc.negocio.comum.validators.UniqueValidator
 *
 * No Java consulta `RepositorioBase.isDuplicado` (JPA). Aqui delegamos a
 * função de checagem via callback `duplicateChecker`, que consumidores podem
 * configurar por DI. Sem checker, a validação é sempre ok.
 */
import { CustomValidator } from './custom-validator';
import type { Unique_ } from './unique';
import type { ValidatorContext } from './validator-context';

export type UniqueDuplicateChecker = (
  entidade: unknown,
  fields: string[],
  values: unknown[],
) => boolean;

export class UniqueValidator extends CustomValidator<Unique_> {
  private static duplicateChecker: UniqueDuplicateChecker | null = null;

  static setDuplicateChecker(fn: UniqueDuplicateChecker | null): void {
    UniqueValidator.duplicateChecker = fn;
  }

  getMessage(): string { return this.spec.message; }
  getGroups(): number[] { return this.spec.groups; }
  protected getCondition(): string { return this.spec.condition; }

  private getAttributeValue(name: string): unknown {
    const bean = this.getBean();
    if (bean == null) return null;
    const obj = bean as Record<string, unknown>;
    const getter = `get${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    const fn = obj[getter];
    if (typeof fn === 'function') return (fn as () => unknown).call(obj);
    return obj[name];
  }

  isValid(context: ValidatorContext): boolean {
    if (context.getValue() == null) return true;
    const values = this.spec.fields.map(f => this.getAttributeValue(f));
    if (!UniqueValidator.duplicateChecker) return true;
    return !UniqueValidator.duplicateChecker(this.getBean(), this.spec.fields, values);
  }
}
