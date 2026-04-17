/**
 * PJe-Calc v2.15.1 — TotalizadorDeHonorario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.TotalizadorDeHonorario
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/TotalizadorDeHonorario.java
 *
 * Soma honorários por devedor (reclamante/reclamado). Honorários cobrados
 * diretamente do reclamante (tipoCobranca=COBRAR) não entram na conta do
 * reclamante — pois nesse caso vão a pagar separadamente.
 * Cache lazy: `reset()` invalida.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo';
import { TipoCobrancaReclamanteEnum, TipoDeDevedorDoHonorarioEnum } from '../../../constantes/enums';
import type { Honorario } from './honorario';

const ZERO = new Decimal(0);

class Total {
  private valor: Decimal = ZERO;
  acumular(v: Decimal | null): void { if (v !== null) this.valor = this.valor.plus(v); }
  getValor(): Decimal { return this.valor; }
}

export class TotalizadorDeHonorario {
  private calculo: Calculo;
  private isCalculado = false;
  private honorariosDevidosPeloReclamante = new Total();
  private honorariosDevidosPeloReclamado = new Total();

  constructor(calculo: Calculo) {
    this.calculo = calculo;
  }

  reset(): void { this.isCalculado = false; }

  private calcular(): this {
    if (this.isCalculado) return this;
    this.honorariosDevidosPeloReclamante = new Total();
    this.honorariosDevidosPeloReclamado = new Total();
    // ducktype — Calculo.getHonorariosDoCalculo() não está tipado ainda (Fase 10).
    const calcExt = this.calculo as unknown as { getHonorariosDoCalculo?(): Iterable<Honorario> };
    for (const honorario of calcExt.getHonorariosDoCalculo?.() ?? []) {
      const total = honorario.getValorTotal();
      if (total === null) continue;
      switch (honorario.getTipoDeDevedor()) {
        case TipoDeDevedorDoHonorarioEnum.RECLAMANTE: {
          const isCobrarDoReclamante = honorario.getTipoCobrancaReclamante() === TipoCobrancaReclamanteEnum.COBRAR;
          this.honorariosDevidosPeloReclamante.acumular(isCobrarDoReclamante ? ZERO : total);
          break;
        }
        case TipoDeDevedorDoHonorarioEnum.RECLAMADO:
          this.honorariosDevidosPeloReclamado.acumular(total);
          break;
      }
    }
    this.isCalculado = true;
    return this;
  }

  getTotalDevidoPeloReclamante(): Decimal {
    return this.calcular().honorariosDevidosPeloReclamante.getValor();
  }

  getTotalDevidoPeloReclamado(): Decimal {
    return this.calcular().honorariosDevidosPeloReclamado.getValor();
  }
}
