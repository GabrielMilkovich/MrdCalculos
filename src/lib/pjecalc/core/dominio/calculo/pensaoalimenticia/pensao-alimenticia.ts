/**
 * PJe-Calc v2.15.1 — PensaoAlimenticia
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia
 *
 * Calcula a pensão alimentícia como percentual sobre o líquido (ou bruto).
 * Pode incidir também sobre FGTS.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export class PensaoAlimenticia implements IModuloLiquidavel {
  private percentual: Decimal = new Decimal(0);
  private valorFixo: Decimal | null = null;
  private apurar: boolean = false;
  private base: 'liquido' | 'bruto' | 'bruto_menos_inss' = 'liquido';
  private valorCalculado: Decimal = new Decimal(0);
  private valorSobreFgts: Decimal = new Decimal(0);

  getPercentual(): Decimal { return this.percentual; }
  setPercentual(v: Decimal): void { this.percentual = v; }
  getValorFixo(): Decimal | null { return this.valorFixo; }
  setValorFixo(v: Decimal): void { this.valorFixo = v; }
  getApurar(): boolean { return this.apurar; }
  setApurar(v: boolean): void { this.apurar = v; }
  getBase(): string { return this.base; }
  setBase(v: 'liquido' | 'bruto' | 'bruto_menos_inss'): void { this.base = v; }
  getValorCalculado(): Decimal { return this.valorCalculado; }
  getValorSobreFgts(): Decimal { return this.valorSobreFgts; }
  getTotal(): Decimal { return this.valorCalculado.plus(this.valorSobreFgts); }

  calcular(baseLiquido: Decimal, fgtsTotal: Decimal): void {
    if (!this.apurar || this.percentual.isZero()) return;
    if (this.valorFixo !== null && !this.valorFixo.isZero()) {
      this.valorCalculado = this.valorFixo;
      return;
    }
    const pct = this.percentual.div(100);
    this.valorCalculado = arredondarValorMonetario(baseLiquido.times(pct));
    if (!fgtsTotal.isZero()) {
      this.valorSobreFgts = arredondarValorMonetario(fgtsTotal.times(pct));
    }
  }

  liquidar(): void { /* Chamado via calcular() externamente */ }
}
