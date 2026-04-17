/**
 * PJe-Calc v2.15.1 — PensaoAlimenticiaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/PensaoAlimenticiaJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class PensaoAlimenticiaJRAdapter extends JRAdapter {
  abstract getAliquota(): Decimal;
  abstract getOcorrencias(): JRAdapterDataSource<PensaoOcorrenciaAdapter>;
  abstract getTotalDevido(): Decimal;
  abstract getTotalCorrigido(): Decimal;
}

export abstract class PensaoOcorrenciaAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getValorPensao(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
}
