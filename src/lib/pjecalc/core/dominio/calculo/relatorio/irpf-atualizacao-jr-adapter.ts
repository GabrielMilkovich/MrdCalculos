/**
 * PJe-Calc v2.15.1 — IrpfAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/IrpfAtualizacaoJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class IrpfAtualizacaoJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<IrpfAtualizacaoItemAdapter>;
  abstract getTotalDevido(): Decimal;
  abstract getTotalJuros(): Decimal;
  abstract getTotalMulta(): Decimal;
  abstract getTotalGeral(): Decimal;
  abstract getTotalPago(): Decimal;
  abstract getTotalDiferenca(): Decimal;
}

export abstract class IrpfAtualizacaoItemAdapter extends JRAdapter {
  abstract getDataOcorrencia(): Date;
  abstract getDataEvento(): Date;
  abstract getValorBase(): Decimal;
  abstract getAliquota(): Decimal;
  abstract getValorDeducao(): Decimal;
  abstract getDevido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getMulta(): Decimal;
  abstract getTotal(): Decimal;
  abstract getPago(): Decimal;
  abstract getDiferenca(): Decimal;
}
