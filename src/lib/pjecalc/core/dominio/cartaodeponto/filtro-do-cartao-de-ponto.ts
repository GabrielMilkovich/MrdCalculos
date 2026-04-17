/**
 * PJe-Calc v2.15.1 — FiltroDoCartaoDePonto (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.FiltroDoCartaoDePonto
 */
import type { Calculo } from '../calculo/calculo';
import type { CartaoDePonto } from './cartao-de-ponto';

export class FiltroDoCartaoDePonto {
  private calculo: Calculo | null = null;
  private nome: string | null = null;

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getNome(): string | null { return this.nome; }
  setNome(v: string | null): void { this.nome = v; }

  filtrar(): CartaoDePonto[] {
    return []; // TODO(fase-13/infra)
  }
}
