/**
 * PJe-Calc v2.15.1 — SeguroDesemprego
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego
 *
 * Lei 7.998/90 — seguro-desemprego por demissão sem justa causa.
 * Calcula valor das parcelas baseado nos últimos salários.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export class SeguroDesemprego implements IModuloLiquidavel {
  private apurar: boolean = false;
  private parcelas: number = 0;
  private valorParcela: Decimal = new Decimal(0);
  private recebeu: boolean = false;
  private total: Decimal = new Decimal(0);

  getApurar(): boolean { return this.apurar; }
  setApurar(v: boolean): void { this.apurar = v; }
  getParcelas(): number { return this.parcelas; }
  setParcelas(v: number): void { this.parcelas = v; }
  getValorParcela(): Decimal { return this.valorParcela; }
  setValorParcela(v: Decimal): void { this.valorParcela = v; }
  getRecebeu(): boolean { return this.recebeu; }
  setRecebeu(v: boolean): void { this.recebeu = v; }
  getTotal(): Decimal { return this.total; }

  liquidar(): void {
    if (!this.apurar || this.parcelas <= 0 || this.recebeu) {
      this.total = new Decimal(0);
      return;
    }
    this.total = arredondarValorMonetario(this.valorParcela.times(this.parcelas));
  }
}
