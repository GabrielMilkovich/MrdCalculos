/**
 * PJe-Calc v2.15.1 — SeguroDesemprego
 * Porte SIMPLIFICADO de: br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego
 *
 * AVISO (STATE-OF-PRODUCTION P0-2): este arquivo cobre apenas ~3% do Java
 * original (1280 LOC distribuidos em 6 arquivos). Implementa `parcelas × valor`.
 * NAO implementa: calculo do numero de parcelas conforme Lei 7.998/90 art.4o,
 * faixas de valor por ano-base e SM, regra de carencia por solicitacao anterior
 * (decreto 2.722/98), apuracao da media dos 3 ultimos salarios devidos.
 * Use com cautela — valor em peca processual deve ser conferido manualmente
 * contra PJe-Calc oficial.
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
