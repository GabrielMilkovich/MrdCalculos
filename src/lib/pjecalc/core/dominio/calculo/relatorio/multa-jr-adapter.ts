/**
 * PJe-Calc v2.15.1 — MultaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.MultaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/MultaJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class MultaJRAdapter extends JRAdapter {
  abstract getMultas(): JRAdapterDataSource<MultaItemAdapter>;
  abstract getTotalReclamanteReclamado(): Decimal;
  abstract getTotalReclamadoReclamante(): Decimal;
  abstract getTotalTerceiroReclamado(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class MultaItemAdapter extends JRAdapter {
  abstract getDescricao(): string;
  abstract getTipoCredorDevedor(): string;
  abstract getNomeTerceiro(): string;
  abstract getTipoValorDaMulta(): string;
  abstract getAliquota(): Decimal;
  abstract getBase(): Decimal;
  abstract getValor(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
  abstract getTaxaJuros(): Decimal;
  abstract getJuros(): Decimal;
  abstract getValorTotal(): Decimal;
}
