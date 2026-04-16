/**
 * PJe-Calc v2.15.1 — Irpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/irpf/Irpf.java (~1675 linhas)
 *
 * O IRPF no PJe-Calc aplica:
 *   - Art. 12-A Lei 7.713/88 (RRA — Rendimentos Recebidos Acumuladamente)
 *   - Tributação exclusiva 13º salário
 *   - Tributação separada de férias
 *   - Dedução de CS (INSS), previdência privada, pensão alimentícia
 *   - Tabela progressiva mensal por NM (número de meses)
 *
 * Neste port, a estrutura está preparada mas a lógica completa será portada
 * quando o módulo de INSS estiver completo (IRPF depende do INSS para dedução).
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export interface FaixaDeIrpf {
  ate: Decimal;
  aliquota: Decimal;
  deducao: Decimal;
}

export class Irpf implements IModuloLiquidavel {
  private baseDeCalculo: Decimal = new Decimal(0);
  private deducoes: Decimal = new Decimal(0);
  private baseTributavel: Decimal = new Decimal(0);
  private impostoDevido: Decimal = new Decimal(0);
  private mesesRRA: number = 1;
  private faixas: FaixaDeIrpf[] = [];
  private deduzirCS: boolean = true;
  private dependentes: number = 0;
  private deducaoDependente: Decimal = new Decimal('189.59'); // 2025

  // ── Getters/Setters ──
  getBaseDeCalculo(): Decimal { return this.baseDeCalculo; }
  getDeducoes(): Decimal { return this.deducoes; }
  getBaseTributavel(): Decimal { return this.baseTributavel; }
  getImpostoDevido(): Decimal { return this.impostoDevido; }
  getMesesRRA(): number { return this.mesesRRA; }
  setMesesRRA(v: number): void { this.mesesRRA = v; }
  setFaixas(v: FaixaDeIrpf[]): void { this.faixas = v; }
  setDeduzirCS(v: boolean): void { this.deduzirCS = v; }
  setDependentes(v: number): void { this.dependentes = v; }
  setDeducaoDependente(v: Decimal): void { this.deducaoDependente = v; }

  /**
   * liquidarComDados — calcula IR Art. 12-A RRA (Lei 7.713/88).
   *
   * Fórmula PJe-Calc:
   *   baseBruta = Σ(verbas com IRPF) − base13 (se trib. exclusiva) − baseFerias (se separada)
   *   NM = total de meses do período (primeira → última competência)
   *   deducoes = CS_segurado + previdencia_privada + pensao + honorarios + (dependentes × deducaoDependente × NM)
   *   baseTributavel = (baseBruta − deducoes) / NM
   *   imposto = aplicarTabelaProgressiva(baseTributavel) × NM
   *
   * @param baseBruta base bruta total de rendimento (verbas com incidência IRPF)
   * @param deducaoCS valor de INSS segurado a deduzir (se deduzirCS=true)
   * @param meses NM (número de meses do período — Art. 12-A)
   */
  liquidarComDados(baseBruta: Decimal, deducaoCS: Decimal, meses: number): void {
    this.mesesRRA = Math.max(1, meses);
    this.baseDeCalculo = baseBruta;

    // Deduções
    let totalDeducoes = new Decimal(0);
    if (this.deduzirCS) totalDeducoes = totalDeducoes.plus(deducaoCS);
    totalDeducoes = totalDeducoes.plus(
      this.deducaoDependente.times(this.dependentes).times(this.mesesRRA)
    );
    this.deducoes = arredondarValorMonetario(totalDeducoes);

    // Base tributável mensal (Art. 12-A: divide pelo NM antes de aplicar tabela)
    const baseMensal = baseBruta.minus(totalDeducoes).div(this.mesesRRA);
    this.baseTributavel = arredondarValorMonetario(baseMensal.isNegative() ? new Decimal(0) : baseMensal);

    // Aplica tabela progressiva sobre a base mensal
    if (this.baseTributavel.isZero() || this.faixas.length === 0) {
      this.impostoDevido = new Decimal(0);
      return;
    }
    let impostoMensal = new Decimal(0);
    for (const faixa of this.faixas) {
      if (this.baseTributavel.comparedTo(faixa.ate) <= 0 || faixa.aliquota.isZero()) {
        impostoMensal = this.baseTributavel.times(faixa.aliquota).minus(faixa.deducao);
        break;
      }
    }
    // Última faixa (sem teto)
    if (impostoMensal.isZero()) {
      const ultimaFaixa = this.faixas[this.faixas.length - 1];
      impostoMensal = this.baseTributavel.times(ultimaFaixa.aliquota).minus(ultimaFaixa.deducao);
    }

    // Imposto total = mensal × NM (Art. 12-A)
    const impostoTotal = impostoMensal.isNegative() ? new Decimal(0) : impostoMensal.times(this.mesesRRA);
    this.impostoDevido = arredondarValorMonetario(impostoTotal);
  }

  /** liquidar via IModuloLiquidavel — stub sem dados diretos */
  liquidar(): void {
    // O Calculo.liquidar() deve chamar liquidarComDados() passando as bases
  }
}
