/**
 * PJe-Calc v2.15.1 — CalculoDoProporcionalizar
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/rotinasdecalculo/CalculoDoProporcionalizar.java
 *
 * Proporcionaliza um valor mensal para um período parcial.
 * Inverso do CalculoDoIntegralizar.
 *
 * Fórmula: resultado = (diasDoPeriodo / diasNoMes) × valor
 *   - diasNoMes: 28, 29 ou 30
 *   - diasDoPeriodo: min(totalDeDias - exclusoes, 30)
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';

export class CalculoDoProporcionalizar {
  private resultado: Decimal = new Decimal(0);

  constructor(
    private periodo: Periodo,
    private valor: Decimal,
    private qtdExclusoes: number = 0
  ) {}

  executar(): void {
    let diasDoPeriodo = this.periodo.totalDeDias() - this.qtdExclusoes;
    if (diasDoPeriodo < 0) diasDoPeriodo = 0;
    if (diasDoPeriodo > 30) diasDoPeriodo = 30;

    const diasNoMesFinal = HelperDate.getInstance(this.periodo.getFinal())!.daysInMonth();
    const diasRef = diasNoMesFinal === 28 ? 28 : diasNoMesFinal === 29 ? 29 : 30;
    this.resultado = new Decimal(diasDoPeriodo).div(diasRef).times(this.valor);
  }

  getResultado(): Decimal { return this.resultado; }
}
