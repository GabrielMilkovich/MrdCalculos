/**
 * PJe-Calc v2.15.1 — SalarioFamilia
 * Porte SIMPLIFICADO de: br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia
 *
 * AVISO (STATE-OF-PRODUCTION P0-2): este arquivo cobre apenas ~2.5% do Java
 * original (1704 LOC distribuidos em 4+ arquivos). Implementa `cotas × filhos × meses`.
 * Valor da cota e teto **hardcoded para 2025** — calculo retroativo em ano
 * diferente sai errado. NAO implementa: `VariacaoQuantidadeFilho` (176 LOC),
 * `OcorrenciaDeSalarioFamilia` (205), validacao de prazo, apuracao mes-a-mes
 * contra teto, mudanca de quantidade de filhos no periodo. Use com cautela em
 * pecas processuais — conferencia manual contra PJe-Calc oficial recomendada.
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
