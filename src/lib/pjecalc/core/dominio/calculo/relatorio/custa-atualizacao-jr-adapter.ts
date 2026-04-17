/**
 * PJe-Calc v2.15.1 — CustaAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/CustaAtualizacaoJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class CustaAtualizacaoJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<CustaAtualizacaoItemAdapter>;
  abstract getTotalDevido(): Decimal;
  abstract getTotalDevidoCorrigido(): Decimal;
  abstract getTotalJuros(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class CustaAtualizacaoItemAdapter extends JRAdapter {
  abstract getDataEvento(): Date;
  abstract getDescricao(): string;
  abstract getDevido(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getDevidoCorrigido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getTotal(): Decimal;
}
