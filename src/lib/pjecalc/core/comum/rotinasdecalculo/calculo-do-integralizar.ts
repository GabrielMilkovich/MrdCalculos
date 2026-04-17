/**
 * PJe-Calc v2.15.1 — CalculoDoIntegralizar
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/comum/rotinasdecalculo/CalculoDoIntegralizar.java
 *
 * Extrapola um valor proporcional (de um período parcial) para o valor "integral"
 * (como se fosse o mês completo). Usado para devidoIntegral, pagoIntegral, quantidadeIntegral.
 *
 * Fórmula: resultado = valor × diasNoMes / diasDoPeriodo
 *   - diasNoMes: 28, 29 ou 30 (nunca 31 — PJe-Calc usa 30 para meses com 30 ou 31 dias)
 *   - diasDoPeriodo: min(totalDeDias - exclusoes, 30)
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { naoNulos } from '../../base/comum/utils';

export class CalculoDoIntegralizar {
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

    if (diasDoPeriodo > 0) {
      const diasNoMesFinal = HelperDate.getInstance(this.periodo.getFinal())!.daysInMonth();
      const diasRef = diasNoMesFinal === 28 ? 28 : diasNoMesFinal === 29 ? 29 : 30;
      this.resultado = this.valor.times(diasRef).div(diasDoPeriodo);
    } else {
      this.resultado = new Decimal(0);
    }
  }

  getResultado(): Decimal { return this.resultado; }
}
