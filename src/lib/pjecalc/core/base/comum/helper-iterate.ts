/**
 * PJe-Calc v2.15.1 — HelperIterate
 * Porte 1:1 de: br.jus.trt8.pjecalc.base.comum.HelperIterate
 *
 * Wrapper que encapsula `collection.some(predicate)`. Em Java serve como
 * açúcar sintático; em TS é redundante com `Array.prototype.some`, mas
 * mantemos para preservar simetria quando o código cliente for portado.
 *
 * Uso fluente:
 *   HelperIterate.iterate(items).where((i) => i.valor > 0);
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/HelperIterate.java
 */
import { naoNulo } from './utils';

/** Predicate para uso com HelperIterate.where. */
export type Where<E> = (item: E) => boolean;

export class HelperIterate<E> {
  private readonly collection: Iterable<E> | null | undefined;

  private constructor(collection: Iterable<E> | null | undefined) {
    this.collection = collection;
  }

  /** HelperIterate.iterate (linha 16) — entry point fluente. */
  static iterate<E>(collection: Iterable<E> | null | undefined): HelperIterate<E> {
    return new HelperIterate<E>(collection);
  }

  /**
   * HelperIterate.where (linha 20).
   * Retorna TRUE se ao menos um elemento satisfaz `where`.
   * Coleção null → FALSE (sem iteração).
   */
  where(where: Where<E>): boolean {
    if (!naoNulo(this.collection)) return false;
    for (const item of this.collection as Iterable<E>) {
      if (where(item)) return true;
    }
    return false;
  }
}
