/**
 * PJe-Calc v2.15.1 — CustasFixasWrapper
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasWrapper
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/CustasFixasWrapper.java
 *
 * ViewObject que encapsula uma linha de custa fixa para exibição (relatório),
 * com getters derivados valorCorrigido / juros / total.
 */
import Decimal from 'decimal.js';

const ZERO = new Decimal(0);

export class CustasFixasWrapper {
  private ocorrencia: Date;
  private tipo: string;
  private base: Decimal;
  private quantidade: number;
  private valor: Decimal;
  private indiceDeCorrecao: Decimal | null;
  private taxaDeJuros: Decimal | null;

  constructor(
    ocorrencia: Date,
    tipo: string,
    base: Decimal,
    quantidade: number,
    valor: Decimal,
    indiceDeCorrecao: Decimal | null,
    taxaDeJuros: Decimal | null,
  ) {
    this.ocorrencia = ocorrencia;
    this.tipo = tipo;
    this.base = base;
    this.quantidade = quantidade;
    this.valor = valor;
    this.indiceDeCorrecao = indiceDeCorrecao;
    this.taxaDeJuros = taxaDeJuros;
  }

  getOcorrencia(): Date { return this.ocorrencia; }
  getTipo(): string { return this.tipo; }
  getBase(): Decimal { return this.base; }
  getQuantidade(): number { return this.quantidade; }
  getValor(): Decimal { return this.valor; }
  getIndiceDeCorrecao(): Decimal | null { return this.indiceDeCorrecao; }

  /** getValorCorrigido (Java linha 53) — valor × indice (fallback 0). */
  getValorCorrigido(): Decimal {
    if (this.indiceDeCorrecao === null) return ZERO;
    return this.valor.times(this.indiceDeCorrecao);
  }

  /** getJuros (Java linha 57) — valorCorrigido × taxa/100 (fallback 0). */
  getJuros(): Decimal {
    if (this.taxaDeJuros === null) return ZERO;
    return this.getValorCorrigido().times(this.taxaDeJuros).div(100);
  }

  /** getTotal (Java linha 61) — valorCorrigido + juros. */
  getTotal(): Decimal {
    return this.getValorCorrigido().plus(this.getJuros());
  }
}
