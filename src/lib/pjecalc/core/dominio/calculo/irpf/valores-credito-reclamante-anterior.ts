/**
 * PJe-Calc v2.15.1 — ValoresCreditoReclamanteAnterior
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ValoresCreditoReclamanteAnterior
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/ValoresCreditoReclamanteAnterior.java (package-private)
 *
 * Registro auxiliar usado pelo `MaquinaDeCalculoDeIrpf` para armazenar
 * valores anteriores de crédito (pago + diferença principal) por data.
 * Inclui `numeroCompetencia` que é preenchido posteriormente.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';

const ZERO = new Decimal(0);

export class ValoresCreditoReclamanteAnterior {
  private pagoAnterior: Decimal;
  private diferencaPrincipalAnterior: Decimal;
  private dataAnterior: Date;
  private numeroCompetencia: Decimal = ZERO;

  constructor(pagoAnterior: Decimal, diferencaPrincipalAnterior: Decimal, dataAnterior: Date) {
    this.pagoAnterior = pagoAnterior;
    this.diferencaPrincipalAnterior = diferencaPrincipalAnterior;
    this.dataAnterior = dataAnterior;
  }

  getPagoAnterior(): Decimal { return this.pagoAnterior; }
  setPagoAnterior(v: Decimal): void { this.pagoAnterior = v; }

  getDiferencaPrincipalAnterior(): Decimal { return this.diferencaPrincipalAnterior; }
  getDataAnterior(): Date { return this.dataAnterior; }

  getNumeroCompetencia(): Decimal { return this.numeroCompetencia; }
  setNumeroCompetencia(v: Decimal): void { this.numeroCompetencia = v; }

  /** incluirNoValorAnterior (Java linha 48) — localiza pela data e atualiza numero. */
  static incluirNoValorAnterior(
    numeroCompetencias: Decimal,
    dataPeriodo: Date,
    valoresAnteriores: ValoresCreditoReclamanteAnterior[],
  ): void {
    for (const vcra of valoresAnteriores) {
      if (!HelperDate.dateEquals(vcra.getDataAnterior(), dataPeriodo)) continue;
      vcra.setNumeroCompetencia(numeroCompetencias);
      break;
    }
  }

  /** calcularCompetenciasSaldo (Java linha 56) — subtrai todas as competências da lista. */
  static calcularCompetenciasSaldo(
    totalMeses: Decimal,
    valoresAnteriores: ValoresCreditoReclamanteAnterior[],
  ): Decimal {
    let competenciaTotal = totalMeses;
    for (const vcra of valoresAnteriores) {
      competenciaTotal = competenciaTotal.minus(vcra.getNumeroCompetencia());
    }
    return competenciaTotal;
  }
}
