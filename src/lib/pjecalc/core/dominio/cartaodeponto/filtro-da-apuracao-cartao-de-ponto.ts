/**
 * PJe-Calc v2.15.1 — FiltroDaApuracaoCartaoDePonto (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.FiltroDaApuracaoCartaoDePonto
 */
import type { Calculo } from '../calculo/calculo';
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';

export class FiltroDaApuracaoCartaoDePonto {
  private calculo: Calculo | null = null;

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  filtrar(): ApuracaoCartaoDePonto[] {
    return []; // TODO(fase-13/infra)
  }
}
