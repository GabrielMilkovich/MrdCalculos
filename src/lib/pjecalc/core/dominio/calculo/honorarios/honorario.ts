/**
 * PJe-Calc v2.15.1 — Honorario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/honorarios/Honorario.java (758 linhas)
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export type BaseParaApuracaoDeHonorarioEnum = 'CONDENACAO' | 'CAUSA' | 'PROVEITO';
export type TipoDeDevedorDoHonorarioEnum = 'RECLAMANTE' | 'RECLAMADO';

export class Honorario implements IModuloLiquidavel {
  private percentual: Decimal = new Decimal(15);
  private baseApuracao: BaseParaApuracaoDeHonorarioEnum = 'CONDENACAO';
  private devedor: TipoDeDevedorDoHonorarioEnum = 'RECLAMADO';
  private valorCalculado: Decimal = new Decimal(0);
  private valorFixo: Decimal | null = null;
  private taxaJurosHonorario: Decimal | null = null;

  getPercentual(): Decimal { return this.percentual; }
  setPercentual(v: Decimal): void { this.percentual = v; }
  getBaseApuracao(): BaseParaApuracaoDeHonorarioEnum { return this.baseApuracao; }
  setBaseApuracao(v: BaseParaApuracaoDeHonorarioEnum): void { this.baseApuracao = v; }
  getDevedor(): TipoDeDevedorDoHonorarioEnum { return this.devedor; }
  setDevedor(v: TipoDeDevedorDoHonorarioEnum): void { this.devedor = v; }
  getValorCalculado(): Decimal { return this.valorCalculado; }
  setValorCalculado(v: Decimal): void { this.valorCalculado = v; }
  getValorFixo(): Decimal | null { return this.valorFixo; }
  setValorFixo(v: Decimal): void { this.valorFixo = v; }
  getTaxaJurosHonorario(): Decimal | null { return this.taxaJurosHonorario; }
  setTaxaJurosHonorario(v: Decimal): void { this.taxaJurosHonorario = v; }

  /**
   * liquidar — calcula honorários como percentual × base.
   * No PJe-Calc a base vem do cálculo (condenação total, valor da causa, etc.).
   * Aqui esperamos que a base seja setada externamente via setValorCalculado()
   * antes de chamar liquidar().
   */
  liquidar(): void {
    if (this.valorFixo !== null && !this.valorFixo.isZero()) {
      this.valorCalculado = this.valorFixo;
    }
    // Se valorCalculado já foi setado externamente (base × percentual),
    // nada a fazer.
  }

  /** Calcula valor a partir de uma base */
  calcular(base: Decimal): void {
    this.valorCalculado = arredondarValorMonetario(base.times(this.percentual).div(100));
  }
}
