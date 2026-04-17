/**
 * PJe-Calc v2.15.1 — SeguroDesempregoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/SeguroDesempregoJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class SeguroDesempregoJRAdapter extends JRAdapter {
  abstract getParcelas(): JRAdapterDataSource<SeguroDesempregoParcelaAdapter>;
  abstract getBaseMediaUltimosSalarios(): Decimal;
  abstract getQuantidadeParcelas(): number;
  abstract getValorTotal(): Decimal;
}

export abstract class SeguroDesempregoParcelaAdapter extends JRAdapter {
  abstract getNumeroParcela(): number;
  abstract getCompetencia(): Date;
  abstract getValor(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
}
