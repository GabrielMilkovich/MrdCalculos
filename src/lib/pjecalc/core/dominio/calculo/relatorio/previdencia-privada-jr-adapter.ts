/**
 * PJe-Calc v2.15.1 — PrevidenciaPrivadaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/PrevidenciaPrivadaJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class PrevidenciaPrivadaJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<PrevidenciaPrivadaOcorrenciaAdapter>;
  abstract getTotalDevido(): Decimal;
  abstract getTotalDevidoCorrigido(): Decimal;
}

export abstract class PrevidenciaPrivadaOcorrenciaAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getAliquota(): Decimal;
  abstract getValor(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
}
