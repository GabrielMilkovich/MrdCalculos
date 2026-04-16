/**
 * PJe-Calc v2.15.1 — Falta
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/faltas/Falta.java (225 linhas)
 *
 * Registro de falta/afastamento com período e justificativa.
 */
import { Periodo } from '../../../base/comum/periodo';
import { HelperDate } from '../../../base/comum/helper-date';

export class Falta {
  private dataInicio: Date | null = null;
  private dataFim: Date | null = null;
  private justificada: boolean = false;
  private justificativa: string = '';

  constructor(dataInicio?: Date, dataFim?: Date, justificada?: boolean) {
    if (dataInicio) this.dataInicio = dataInicio;
    if (dataFim) this.dataFim = dataFim;
    if (justificada !== undefined) this.justificada = justificada;
  }

  getDataInicio(): Date | null { return this.dataInicio; }
  setDataInicio(v: Date): void { this.dataInicio = v; }
  getDataFim(): Date | null { return this.dataFim; }
  setDataFim(v: Date): void { this.dataFim = v; }
  getJustificada(): boolean { return this.justificada; }
  setJustificada(v: boolean): void { this.justificada = v; }
  getJustificativa(): string { return this.justificativa; }
  setJustificativa(v: string): void { this.justificativa = v; }

  getPeriodo(): Periodo | null {
    if (!this.dataInicio || !this.dataFim) return null;
    return new Periodo(this.dataInicio, this.dataFim);
  }

  getTotalDeDias(): number {
    if (!this.dataInicio || !this.dataFim) return 0;
    return HelperDate.countDays(this.dataInicio, this.dataFim) + 1;
  }
}
