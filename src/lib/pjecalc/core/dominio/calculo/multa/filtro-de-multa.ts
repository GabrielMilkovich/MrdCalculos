/**
 * PJe-Calc v2.15.1 — FiltroDeMulta
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.FiltroDeMulta
 *
 * Ref Java: pjecalc-fonte/.../calculo/multa/FiltroDeMulta.java
 *
 * Filtro stub — depende de repositório (infra).
 */
import type { Calculo } from '../calculo';
import type { Multa } from './multa';

export class FiltroDeMulta {
  private calculo: Calculo | null = null;

  setCalculo(c: Calculo | null): void { this.calculo = c; }

  filtrar(): Multa[] {
    return []; // TODO(fase-8/infra)
  }

  filtrarAtualizacao(): Multa[] {
    return [];
  }
}
