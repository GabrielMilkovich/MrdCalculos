/**
 * PJe-Calc v2.15.1 — Multa
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa
 *
 * Multa do Art. 467 CLT (verbas incontroversas) e Art. 523 §1° CPC
 * (não pagamento no prazo de cumprimento de sentença).
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export class Multa implements IModuloLiquidavel {
  private percentual: Decimal = new Decimal(10);
  private valorBase: Decimal = new Decimal(0);
  private valorCalculado: Decimal = new Decimal(0);
  private tipo: 'ART_467' | 'ART_523' = 'ART_523';
  private taxaJurosMulta: Decimal | null = null;

  getPercentual(): Decimal { return this.percentual; }
  setPercentual(v: Decimal): void { this.percentual = v; }
  getValorBase(): Decimal { return this.valorBase; }
  setValorBase(v: Decimal): void { this.valorBase = v; }
  getValorCalculado(): Decimal { return this.valorCalculado; }
  getTipo(): string { return this.tipo; }
  setTipo(v: 'ART_467' | 'ART_523'): void { this.tipo = v; }
  getTaxaJurosMulta(): Decimal | null { return this.taxaJurosMulta; }
  setTaxaJurosMulta(v: Decimal): void { this.taxaJurosMulta = v; }

  liquidar(): void {
    this.valorCalculado = arredondarValorMonetario(
      this.valorBase.times(this.percentual).div(100)
    );
  }
}
