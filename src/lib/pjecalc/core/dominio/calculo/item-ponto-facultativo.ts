/**
 * PJe-Calc v2.15.1 — ItemPontoFacultativo (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.ItemPontoFacultativo
 *
 * Ref Java: pjecalc-fonte/.../calculo/ItemPontoFacultativo.java (~147 linhas)
 *
 * Associação entre um Calculo e um Feriado (ponto facultativo) que deve ser
 * considerado na apuração da carga horária/horas extras.
 */
import type { Calculo } from './calculo';

/** Stub de Feriado — entidade completa em fase futura. */
export interface Feriado {
  getData?(): Date | null;
  getDescricao?(): string | null;
}

export class ItemPontoFacultativo {
  private id: number | null = null;
  private pontoFacultativo: Feriado | null = null;
  private calculo: Calculo | null = null;

  constructor(calculo: Calculo | null = null, pontoFacultativo: Feriado | null = null) {
    this.calculo = calculo;
    this.pontoFacultativo = pontoFacultativo;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getPontoFacultativo(): Feriado | null { return this.pontoFacultativo; }
  setPontoFacultativo(v: Feriado | null): void { this.pontoFacultativo = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }
}
