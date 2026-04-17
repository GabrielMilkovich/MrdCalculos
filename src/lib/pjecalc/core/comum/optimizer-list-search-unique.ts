/**
 * PJe-Calc v2.15.1 — OptimizerListSearchUnique
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/OptimizerListSearchUnique.java
 *
 * Variante de `OptimizerListSearch` onde cada chave mapeia para um único
 * elemento (não uma lista de ocorrências). Usada quando o agrupamento já
 * garante unicidade (ex: competência + 13º flag).
 */
export abstract class OptimizerListSearchUnique<K, E> {
  abstract init(collection: Iterable<E>): OptimizerListSearchUnique<K, E>;
  abstract search(key: K): E | null;
}
