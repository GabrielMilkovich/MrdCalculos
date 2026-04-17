/**
 * PJe-Calc v2.15.1 — TotalizadorDeMulta
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.TotalizadorDeMulta
 *
 * Ref Java: pjecalc-fonte/.../calculo/multa/TotalizadorDeMulta.java
 *
 * Soma multas por categoria CredorDevedor (reclamanteReclamado,
 * reclamadoReclamante, terceiroReclamado). `reset()` invalida cache.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo';
import { CredorDevedorMultaEnum } from '../../../constantes/enums';
import type { Multa } from './multa';

const ZERO = new Decimal(0);

class Total {
  private valor: Decimal = ZERO;
  acumular(v: Decimal | null): void { if (v !== null) this.valor = this.valor.plus(v); }
  getValor(): Decimal { return this.valor; }
}

export class TotalizadorDeMulta {
  private calculo: Calculo;
  private isCalculado = false;
  private reclamanteReclamado = new Total();
  private reclamadoReclamante = new Total();
  private terceiroReclamado = new Total();

  constructor(calculo: Calculo) {
    this.calculo = calculo;
  }

  reset(): void { this.isCalculado = false; }

  private calcular(): this {
    if (this.isCalculado) return this;
    this.reclamanteReclamado = new Total();
    this.reclamadoReclamante = new Total();
    this.terceiroReclamado = new Total();
    const calcExt = this.calculo as unknown as { getMultasDoCalculo?(): Iterable<Multa> };
    for (const m of calcExt.getMultasDoCalculo?.() ?? []) {
      const total = m.getValorTotal();
      if (total === null) continue;
      switch (m.getTipoCredorDevedor()) {
        case CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO:
          this.reclamanteReclamado.acumular(total);
          break;
        case CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE:
          this.reclamadoReclamante.acumular(total);
          break;
        case CredorDevedorMultaEnum.TERCEIRO_RECLAMADO:
          this.terceiroReclamado.acumular(total);
          break;
      }
    }
    this.isCalculado = true;
    return this;
  }

  getTotalTipoReclamanteReclamado(): Decimal { return this.calcular().reclamanteReclamado.getValor(); }
  getTotalTipoReclamadoReclamante(): Decimal { return this.calcular().reclamadoReclamante.getValor(); }
  getTotalTipoTerceiroReclamado(): Decimal { return this.calcular().terceiroReclamado.getValor(); }
}
