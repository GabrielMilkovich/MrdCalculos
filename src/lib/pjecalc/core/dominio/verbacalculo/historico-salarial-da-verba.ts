/**
 * PJe-Calc v2.15.1 — HistoricoSalarialDaVerba
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/HistoricoSalarialDaVerba.java (~152 linhas)
 *
 * Vínculo N:1 entre VerbaDeCalculo e HistoricoSalarial, com:
 *   - tipoVinculoHistorico (BASE | VALOR_PAGO)
 *   - aplicarProporcionalidade (flag)
 *
 * Usado pelo `FormulaCalculada.baseVerba` para apontar quais históricos
 * salariais compõem a base de cálculo da verba.
 */
import { TipoVinculoDeVerbaEnum } from '../../constantes/enums';
import type { VerbaDeCalculo } from './verba-de-calculo';

export class HistoricoSalarialDaVerba {
  private id: number | null = null;
  private verbaDeCalculo: VerbaDeCalculo | null = null;
  private historicoSalarial: unknown | null = null;
  private tipoVinculoHistorico: TipoVinculoDeVerbaEnum = TipoVinculoDeVerbaEnum.BASE;
  private aplicarProporcionalidade: boolean = false;

  constructor(
    verbaDeCalculo: VerbaDeCalculo | null = null,
    historicoSalarial: unknown | null = null,
    tipoVinculoHistorico: TipoVinculoDeVerbaEnum = TipoVinculoDeVerbaEnum.BASE,
    aplicarProporcionalidade: boolean = false,
  ) {
    this.verbaDeCalculo = verbaDeCalculo;
    this.historicoSalarial = historicoSalarial;
    this.tipoVinculoHistorico = tipoVinculoHistorico;
    this.aplicarProporcionalidade = aplicarProporcionalidade;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getVerbaDeCalculo(): VerbaDeCalculo | null { return this.verbaDeCalculo; }
  setVerbaDeCalculo(v: VerbaDeCalculo | null): void { this.verbaDeCalculo = v; }

  getHistoricoSalarial(): unknown | null { return this.historicoSalarial; }
  setHistoricoSalarial(v: unknown | null): void { this.historicoSalarial = v; }

  getTipoVinculoHistorico(): TipoVinculoDeVerbaEnum { return this.tipoVinculoHistorico; }
  setTipoVinculoHistorico(v: TipoVinculoDeVerbaEnum): void { this.tipoVinculoHistorico = v; }

  getAplicarProporcionalidade(): boolean { return this.aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean): void { this.aplicarProporcionalidade = v; }
}
