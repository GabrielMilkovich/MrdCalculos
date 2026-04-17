/**
 * PJe-Calc v2.15.1 — TotalizadorDeVerba
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TotalizadorDeVerba
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/TotalizadorDeVerba.java
 *
 * Acumula totais da verba a partir das ocorrências ativas:
 *   - devido, pago, diferença, diferença corrigida
 *   - diferencaCorrigidaDeFeriasGozadas (só para FERIAS não-indenizadas)
 *   - diferencaCorrigidaParaCalculoDasIncidencias
 * Cache lazy via `calcular()`; `reset()` invalida.
 */
import Decimal from 'decimal.js';
import { CaracteristicaDaVerbaEnum } from '../../constantes/enums';
import type { VerbaDeCalculo } from './verba-de-calculo';

const ZERO = new Decimal(0);

class Total {
  private valor: Decimal = ZERO;
  acumular(v: Decimal | null | undefined): void {
    if (v !== null && v !== undefined) this.valor = this.valor.plus(v);
  }
  getValor(): Decimal { return this.valor; }
}

export class TotalizadorDeVerba {
  private verba: VerbaDeCalculo;
  private isCalculado = false;
  private devido = new Total();
  private pago = new Total();
  private diferenca = new Total();
  private diferencaCorrigida = new Total();
  private diferencaCorrigidaDeFeriasGozadas = new Total();
  private diferencaCorrigidaParaCalculoDasIncidencias = new Total();

  constructor(verba: VerbaDeCalculo) {
    this.verba = verba;
  }

  reset(): void { this.isCalculado = false; }

  private calcular(): this {
    if (this.isCalculado) return this;
    this.devido = new Total();
    this.pago = new Total();
    this.diferenca = new Total();
    this.diferencaCorrigida = new Total();
    this.diferencaCorrigidaDeFeriasGozadas = new Total();
    this.diferencaCorrigidaParaCalculoDasIncidencias = new Total();

    for (const oc of this.verba.getOcorrenciasAtivas()) {
      this.devido.acumular(oc.getDevido?.() ?? null);
      this.pago.acumular(oc.getPago?.() ?? null);
      this.diferenca.acumular(oc.getDiferenca?.() ?? null);
      if (!oc.getAtivo()) continue;
      this.diferencaCorrigida.acumular(oc.getDiferencaCorrigida?.() ?? null);
      const base = oc.getDiferencaCorrigidaParaCalculoDasIncidencias?.() ?? null;
      if (base === null) continue;
      this.diferencaCorrigidaParaCalculoDasIncidencias.acumular(base);
      const isFeriasIndenizadas = (oc as unknown as { isFeriasIndenizadas?(): boolean })
        .isFeriasIndenizadas?.() ?? false;
      if (this.verba.getCaracteristica() !== CaracteristicaDaVerbaEnum.FERIAS || isFeriasIndenizadas) continue;
      this.diferencaCorrigidaDeFeriasGozadas.acumular(base);
    }
    this.isCalculado = true;
    return this;
  }

  getDevido(): Decimal { return this.calcular().devido.getValor(); }
  getPago(): Decimal { return this.calcular().pago.getValor(); }
  getDiferenca(): Decimal { return this.calcular().diferenca.getValor(); }
  getDiferencaCorrigida(): Decimal { return this.calcular().diferencaCorrigida.getValor(); }
  getDiferencaCorrigidaDeFeriasGozadas(): Decimal {
    return this.calcular().diferencaCorrigidaDeFeriasGozadas.getValor();
  }
  getDiferencaCorrigidaParaCalculoDasIncidencias(): Decimal {
    return this.calcular().diferencaCorrigidaParaCalculoDasIncidencias.getValor();
  }
}
