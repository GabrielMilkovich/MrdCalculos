/**
 * PJe-Calc v2.15.1 — ResumoPagamentoUtils
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPagamentoUtils
 *
 * Ref Java: pjecalc-fonte/.../relatorio/ResumoPagamentoUtils.java
 *
 * Utilitários para montar o resumo de um pagamento específico.
 */
import Decimal from 'decimal.js';

export class ResumoPagamentoUtils {
  /** somarValoresAplicados — soma todos os valores aplicados em um pagamento. */
  static somarValoresAplicados(valores: Decimal[]): Decimal {
    return valores.reduce((acc, v) => acc.plus(v), new Decimal(0));
  }

  /** calcularSobra — retorna (pago - aplicado total). */
  static calcularSobra(pago: Decimal, aplicadoTotal: Decimal): Decimal {
    return pago.minus(aplicadoTotal);
  }
}
