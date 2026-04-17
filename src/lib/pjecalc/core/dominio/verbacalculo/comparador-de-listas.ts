/**
 * PJe-Calc v2.15.1 — ComparadorDeListas
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ComparadorDeListas
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/ComparadorDeListas.java (~40 linhas)
 *
 * Utilitário para comparar duas listas ordenadamente-insensitivas,
 * usado no `AnalisadorAlteracaoVerbaDeCalculo` para detectar mudanças.
 */
export class ComparadorDeListas {
  /**
   * saoIguais — compara duas coleções ignorando ordem.
   *
   * @param a primeira lista
   * @param b segunda lista
   * @returns true se ambas têm os mesmos elementos (por `===`)
   */
  static saoIguais<T>(a: Iterable<T> | null | undefined, b: Iterable<T> | null | undefined): boolean {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    const setA = new Set<T>(a);
    const setB = new Set<T>(b);
    if (setA.size !== setB.size) return false;
    for (const v of setA) if (!setB.has(v)) return false;
    return true;
  }
}
