/**
 * PJe-Calc v2.15.1 — CartaoDePontoDaVerba
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.CartaoDePontoDaVerba
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/CartaoDePontoDaVerba.java (~140 linhas)
 *
 * Vínculo entre VerbaDeCalculo e CartaoDePonto — usado em cálculos por
 * jornada quando a verba tem quantidade importada do cartão-ponto.
 */
import type { VerbaDeCalculo } from './verba-de-calculo';

export class CartaoDePontoDaVerba {
  private id: number | null = null;
  private verbaDeCalculo: VerbaDeCalculo | null = null;
  private cartaoDePonto: unknown | null = null;

  constructor(
    verbaDeCalculo: VerbaDeCalculo | null = null,
    cartaoDePonto: unknown | null = null,
  ) {
    this.verbaDeCalculo = verbaDeCalculo;
    this.cartaoDePonto = cartaoDePonto;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getVerbaDeCalculo(): VerbaDeCalculo | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: VerbaDeCalculo | null): void { this.verbaDeCalculo = v; }

  getCartaoDePonto(): unknown | null { return this.cartaoDePonto; }
  setCartaoDePonto(v: unknown | null): void { this.cartaoDePonto = v; }
}
