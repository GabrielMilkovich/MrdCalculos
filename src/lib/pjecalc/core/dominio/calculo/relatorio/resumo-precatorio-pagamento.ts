/**
 * PJe-Calc v2.15.1 — ResumoPrecatorioJRAdapterPagamento (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamento
 *
 * Ref Java: pjecalc-fonte/.../relatorio/ResumoPrecatorioJRAdapterPagamento.java
 *
 * Variante do ResumoPrecatorio para pagamento específico.
 */
import type Decimal from 'decimal.js';
import { AbstractResumoPrecatorioJrAdapter } from './abstract-resumo-precatorio-jr-adapter';

export abstract class ResumoPrecatorioJRAdapterPagamento extends AbstractResumoPrecatorioJrAdapter {
  abstract getDataPagamento(): Date;
  abstract getValorPago(): Decimal;
}
