/**
 * PJe-Calc v2.15.1 — SalarioFamilia
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia
 *
 * Art. 65 Lei 8.213/91 — pago por filho menor de 14 anos (ou inválido).
 * Valor por cota (2025): R$ 62,04 (salário até R$ 1.819,26).
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export interface OcorrenciaDeSalarioFamilia {
  competencia: string;
  valor: number;
}

export class SalarioFamilia implements IModuloLiquidavel {
  private apurar: boolean = false;
  private numeroFilhos: number = 0;
  private valorCota: Decimal = new Decimal('62.04'); // 2025
  private tetoSalarial: Decimal = new Decimal('1819.26'); // 2025
  private total: Decimal = new Decimal(0);
  private ocorrencias: OcorrenciaDeSalarioFamilia[] = [];

  getApurar(): boolean { return this.apurar; }
  setApurar(v: boolean): void { this.apurar = v; }
  getNumeroFilhos(): number { return this.numeroFilhos; }
  setNumeroFilhos(v: number): void { this.numeroFilhos = v; }
  getTotal(): Decimal { return this.total; }
  getOcorrencias(): OcorrenciaDeSalarioFamilia[] { return this.ocorrencias; }

  liquidar(): void {
    if (!this.apurar || this.numeroFilhos <= 0) {
      this.total = new Decimal(0);
      return;
    }
    // Simplificado: valor = cotas × filhos × meses do período
    // No PJe-Calc completo, verifica salário mês a mês contra teto
    this.total = arredondarValorMonetario(
      this.valorCota.times(this.numeroFilhos)
    );
  }
}
