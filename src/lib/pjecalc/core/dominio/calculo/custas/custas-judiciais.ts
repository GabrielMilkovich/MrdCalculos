/**
 * PJe-Calc v2.15.1 — CustasJudiciais
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/custas/CustasJudiciais.java (1078 linhas)
 *
 * Porte simplificado: campos essenciais + cálculo como percentual do valor de condenação.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export class CustasJudiciais implements IModuloLiquidavel {
  private percentual: Decimal = new Decimal(2);
  private valorMinimo: Decimal = new Decimal('10.64');
  private valorMaximo: Decimal | null = null;
  private isento: boolean = false;
  private valorCalculado: Decimal = new Decimal(0);
  private valorFixo: Decimal | null = null;

  getPercentual(): Decimal { return this.percentual; }
  setPercentual(v: Decimal): void { this.percentual = v; }
  getValorMinimo(): Decimal { return this.valorMinimo; }
  setValorMinimo(v: Decimal): void { this.valorMinimo = v; }
  getValorMaximo(): Decimal | null { return this.valorMaximo; }
  setValorMaximo(v: Decimal | null): void { this.valorMaximo = v; }
  getIsento(): boolean { return this.isento; }
  setIsento(v: boolean): void { this.isento = v; }
  getValorCalculado(): Decimal { return this.valorCalculado; }
  getValorFixo(): Decimal | null { return this.valorFixo; }
  setValorFixo(v: Decimal): void { this.valorFixo = v; }

  /** Calcula custas a partir de uma base (valor de condenação) */
  calcular(base: Decimal): void {
    if (this.isento) { this.valorCalculado = new Decimal(0); return; }
    if (this.valorFixo !== null) { this.valorCalculado = this.valorFixo; return; }
    let valor = arredondarValorMonetario(base.times(this.percentual).div(100));
    if (valor.comparedTo(this.valorMinimo) < 0) valor = this.valorMinimo;
    if (this.valorMaximo !== null && valor.comparedTo(this.valorMaximo) > 0) valor = this.valorMaximo;
    this.valorCalculado = valor;
  }

  liquidar(): void {
    // Chamado pelo Calculo — deve ter base já setada via calcular()
  }
}
