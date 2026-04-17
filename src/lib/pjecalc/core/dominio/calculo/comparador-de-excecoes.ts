/**
 * PJe-Calc v2.15.1 — ComparadorDeExcecoes (package-private)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.ComparadorDeExcecoes
 *
 * Ref Java: pjecalc-fonte/.../calculo/ComparadorDeExcecoes.java
 *
 * Struct de comparação (dataInicio + dataFim + valor como strings) usado para
 * deduplicar exceções de carga horária/sábado em AnalisadorAlteracaoCalculo.
 */
export class ComparadorDeExcecoes {
  private dataInicio: string | null;
  private dataFim: string | null;
  private valor: string | null;

  constructor(
    dataInicio: string | null,
    dataFim: string | null,
    valor: string | null,
  ) {
    this.dataInicio = dataInicio;
    this.dataFim = dataFim;
    this.valor = valor;
  }

  /** Chave canônica para Map/Set. */
  toKey(): string {
    return `${this.dataInicio ?? ''}|${this.dataFim ?? ''}|${this.valor ?? ''}`;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof ComparadorDeExcecoes)) return false;
    return this.dataInicio === other.dataInicio
      && this.dataFim === other.dataFim
      && this.valor === other.valor;
  }

  getDataInicio(): string | null { return this.dataInicio; }
  getDataFim(): string | null { return this.dataFim; }
  getValor(): string | null { return this.valor; }
}
