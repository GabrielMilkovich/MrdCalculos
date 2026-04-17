/**
 * PJe-Calc v2.15.1 — OptimizerListSearch + OcorrenciaIterator
 * Porte 1:1 de:
 *   - br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch
 *   - br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator
 *
 * Estrutura que indexa uma coleção por chave (K) e expõe acesso via iterator
 * para múltiplas ocorrências na mesma chave (linked list de wrappers).
 *
 * Ref Java: pjecalc-fonte/.../comum/OptimizerListSearch.java, OcorrenciaIterator.java
 */
export class OcorrenciaIterator<E> implements Iterable<E> {
  private entidades: E[] = [];
  private idx = 0;

  constructor(root: E) {
    this.entidades.push(root);
  }

  /** gotoFirst (linha 19) — reposiciona para o começo */
  gotoFirst(): void { this.idx = 0; }

  /** add (linha 23) — encadeia próxima ocorrência */
  add(entidade: E): this {
    this.entidades.push(entidade);
    return this;
  }

  hasNext(): boolean {
    return this.idx < this.entidades.length;
  }

  next(): E | null {
    if (!this.hasNext()) return null;
    return this.entidades[this.idx++];
  }

  /** Suporta for..of */
  [Symbol.iterator](): Iterator<E> {
    let i = 0;
    const lista = this.entidades;
    return {
      next(): IteratorResult<E> {
        if (i < lista.length) {
          return { value: lista[i++], done: false };
        }
        return { value: undefined as unknown as E, done: true };
      },
    };
  }
}

/**
 * OptimizerListSearch — classe abstrata.
 * Subclasses devem implementar init() e search().
 */
export abstract class OptimizerListSearch<K, E> {
  abstract init(collection: Iterable<E>): OptimizerListSearch<K, E>;
  abstract search(key: K): OcorrenciaIterator<E> | null;

  /** valueOf (linha 15 Java) — retorna primeiro elemento ou null */
  valueOf(key: K): E | null {
    const iterator = this.search(key);
    if (iterator && iterator.hasNext()) {
      return iterator.next();
    }
    return null;
  }
}
