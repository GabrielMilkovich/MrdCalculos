/**
 * PJe-Calc v2.15.1 — ValidatorContext
 * Porte TS-adaptado de: br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext
 *
 * Contexto passado ao validador: o valor a ser validado, o bean de origem
 * e o caminho (propertyName) do atributo sob validação.
 */
export class ValidatorContext {
  constructor(
    private readonly bean: unknown,
    private readonly value: unknown,
    private readonly propertyName: string | null = null,
  ) {}

  getBean(): unknown { return this.bean; }
  getValue(): unknown { return this.value; }
  getPropertyName(): string | null { return this.propertyName; }

  /**
   * Retorna o valor de um atributo do bean (usado para comparações com `with`).
   * Em Java usa Groovy Eval; aqui fazemos acesso via propriedade JavaScript.
   * Suporta paths simples `foo.bar.baz`.
   */
  getMemberValue(path: string): unknown {
    let obj: unknown = this.bean;
    for (const part of path.split('.')) {
      if (obj == null) return null;
      const o = obj as Record<string, unknown> & { [k: string]: unknown };
      const getter = `get${part.charAt(0).toUpperCase()}${part.slice(1)}`;
      if (typeof (o as Record<string, unknown>)[getter] === 'function') {
        obj = ((o as unknown as Record<string, () => unknown>)[getter])();
      } else {
        obj = o[part];
      }
    }
    return obj;
  }
}
