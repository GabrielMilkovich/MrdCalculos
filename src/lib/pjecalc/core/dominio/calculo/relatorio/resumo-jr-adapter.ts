/**
 * PJe-Calc v2.15.1 — ResumoJRAdapter (abstract) + ResumoJRAdapterPagamento
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/ResumoJRAdapter.java
 *
 * Resumo financeiro do cálculo — totais de cada grupo (principal corrigido,
 * juros, multa, honor, FGTS, INSS, IRPF, custas, líquido ao reclamante).
 */
import type Decimal from 'decimal.js';
import { JRAdapter } from './jr-adapter';

export abstract class ResumoJRAdapter extends JRAdapter {
  abstract getValorDevidoReclamante(): Decimal;
  abstract getValorCorrigidoReclamante(): Decimal;
  abstract getJurosReclamante(): Decimal;
  abstract getMultaReclamante(): Decimal;
  abstract getHonorariosReclamante(): Decimal;
  abstract getFgtsReclamante(): Decimal;
  abstract getDescontoInssReclamante(): Decimal;
  abstract getDescontoIrpfReclamante(): Decimal;
  abstract getCustasReclamante(): Decimal;
  abstract getValorLiquidoReclamante(): Decimal;
  abstract getValorTotalGeral(): Decimal;
}

/**
 * ResumoJRAdapterPagamento — variante do resumo aplicável a um pagamento
 * específico (mostra rateio do pagamento entre grupos).
 */
export abstract class ResumoJRAdapterPagamento extends JRAdapter {
  abstract getDataPagamento(): Date;
  abstract getValorPago(): Decimal;
  abstract getValorAplicadoPrincipal(): Decimal;
  abstract getValorAplicadoFgts(): Decimal;
  abstract getValorAplicadoJuros(): Decimal;
  abstract getValorAplicadoHonorarios(): Decimal;
  abstract getValorAplicadoMulta(): Decimal;
  abstract getValorAplicadoInss(): Decimal;
  abstract getValorAplicadoIrpf(): Decimal;
  abstract getSobra(): Decimal;
}
