/**
 * PJe-Calc v2.15.1 — ExcecaoDaCargaHorariaDoCalculo (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDaCargaHorariaDoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/ExcecaoDaCargaHorariaDoCalculo.java (~160 linhas)
 *
 * Altera a carga horária padrão do cálculo em um período específico.
 */
import type Decimal from 'decimal.js';
import { Periodo } from '../../base/comum/periodo';
import type { Calculo } from './calculo';

export class ExcecaoDaCargaHorariaDoCalculo {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private dataInicioExcecao: Date | null = null;
  private dataTerminoExcecao: Date | null = null;
  private valorCargaHoraria: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataInicioExcecao(): Date | null { return this.dataInicioExcecao; }
  setDataInicioExcecao(d: Date | null): void { this.dataInicioExcecao = d; }

  getDataTerminoExcecao(): Date | null { return this.dataTerminoExcecao; }
  setDataTerminoExcecao(d: Date | null): void { this.dataTerminoExcecao = d; }

  getValorCargaHoraria(): Decimal | null { return this.valorCargaHoraria; }
  setValorCargaHoraria(v: Decimal | null): void { this.valorCargaHoraria = v; }

  /** getPeriodo — retorna Periodo(inicio, termino) se ambos presentes. */
  getPeriodo(): Periodo | null {
    if (this.dataInicioExcecao && this.dataTerminoExcecao) {
      return new Periodo(this.dataInicioExcecao, this.dataTerminoExcecao);
    }
    return null;
  }
}
