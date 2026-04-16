/**
 * PJe-Calc v2.15.1 — InssAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/InssAtualizacaoJRAdapter.java
 *
 * Relatório de INSS atualizado pós-liquidação.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class InssAtualizacaoJRAdapter extends JRAdapter {
  abstract getOcorrenciasDevidos(): JRAdapterDataSource<InssAtualizacaoItemAdapter>;
  abstract getOcorrenciasPagos(): JRAdapterDataSource<InssAtualizacaoItemAdapter>;
  abstract getTotalDevido(): Decimal;
  abstract getTotalDevidoCorrigido(): Decimal;
  abstract getTotalJuros(): Decimal;
  abstract getTotalMulta(): Decimal;
  abstract getTotalGeral(): Decimal;
  abstract getTotalPago(): Decimal;
  abstract getTotalDiferenca(): Decimal;
}

export abstract class InssAtualizacaoItemAdapter extends JRAdapter {
  abstract getDataOcorrencia(): Date;
  abstract getDataEvento(): Date;
  abstract getDevido(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getDevidoCorrigido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getMulta(): Decimal;
  abstract getTotal(): Decimal;
  abstract getPago(): Decimal;
  abstract getDiferenca(): Decimal;
}
