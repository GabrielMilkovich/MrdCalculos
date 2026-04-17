/**
 * PJe-Calc v2.15.1 — HonorarioJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.HonorarioJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/HonorarioJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class HonorarioJRAdapter extends JRAdapter {
  abstract getHonorarios(): JRAdapterDataSource<HonorarioItemAdapter>;
  abstract getTotalDevidoPeloReclamante(): Decimal;
  abstract getTotalDevidoPeloReclamado(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class HonorarioItemAdapter extends JRAdapter {
  abstract getDescricao(): string;
  abstract getTipoHonorario(): string;
  abstract getTipoDeDevedor(): string;
  abstract getNomeCredor(): string;
  abstract getTipoDocFiscalCredor(): string;
  abstract getNumeroDocFiscalCredor(): string;
  abstract getAliquota(): Decimal;
  abstract getBase(): Decimal;
  abstract getValor(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
  abstract getTaxaJuros(): Decimal;
  abstract getJuros(): Decimal;
  abstract getValorImpostoRenda(): Decimal;
  abstract getValorTotal(): Decimal;
}
