/**
 * PJe-Calc v2.15.1 — ValeTransporteDaVerba
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/ValeTransporteDaVerba.java (~140 linhas)
 *
 * Vínculo entre VerbaDeCalculo e ValeTransporte (usado para calcular
 * desconto de vale-transporte no salário — 6% normalmente).
 */
import { TipoVinculoDeVerbaEnum } from '../../constantes/enums';
import type { VerbaDeCalculo } from './verba-de-calculo';

export class ValeTransporteDaVerba {
  private id: number | null = null;
  private verbaDeCalculo: VerbaDeCalculo | null = null;
  private valeTransporte: unknown | null = null;
  private tipoVinculo: TipoVinculoDeVerbaEnum = TipoVinculoDeVerbaEnum.BASE;
  private aplicarProporcionalidade: boolean = false;

  constructor(
    verbaDeCalculo: VerbaDeCalculo | null = null,
    valeTransporte: unknown | null = null,
    tipoVinculo: TipoVinculoDeVerbaEnum = TipoVinculoDeVerbaEnum.BASE,
    aplicarProporcionalidade: boolean = false,
  ) {
    this.verbaDeCalculo = verbaDeCalculo;
    this.valeTransporte = valeTransporte;
    this.tipoVinculo = tipoVinculo;
    this.aplicarProporcionalidade = aplicarProporcionalidade;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getVerbaDeCalculo(): VerbaDeCalculo | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: VerbaDeCalculo | null): void { this.verbaDeCalculo = v; }

  getValeTransporte(): unknown | null { return this.valeTransporte; }
  setValeTransporte(v: unknown | null): void { this.valeTransporte = v; }

  getTipoVinculo(): TipoVinculoDeVerbaEnum { return this.tipoVinculo; }
  setTipoVinculo(v: TipoVinculoDeVerbaEnum): void { this.tipoVinculo = v; }

  getAplicarProporcionalidade(): boolean { return this.aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean): void { this.aplicarProporcionalidade = v; }
}
