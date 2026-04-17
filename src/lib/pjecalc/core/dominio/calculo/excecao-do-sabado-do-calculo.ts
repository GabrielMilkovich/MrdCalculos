/**
 * PJe-Calc v2.15.1 — ExcecaoDoSabadoDoCalculo (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDoSabadoDoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/ExcecaoDoSabadoDoCalculo.java (~154 linhas)
 *
 * Marca períodos em que o "sábado é dia útil" (flag padrão do cálculo)
 * tem uma exceção. Cada período define se, nele, o sábado é ou não útil.
 */
import { Periodo } from '../../base/comum/periodo';
import type { Calculo } from './calculo';

export class ExcecaoDoSabadoDoCalculo {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private dataInicioExcecao: Date | null = null;
  private dataTerminoExcecao: Date | null = null;
  private sabadoDiaUtil: boolean = true;

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

  getSabadoDiaUtil(): boolean { return this.sabadoDiaUtil; }
  setSabadoDiaUtil(v: boolean): void { this.sabadoDiaUtil = v; }

  getPeriodo(): Periodo | null {
    if (this.dataInicioExcecao && this.dataTerminoExcecao) {
      return new Periodo(this.dataInicioExcecao, this.dataTerminoExcecao);
    }
    return null;
  }
}
