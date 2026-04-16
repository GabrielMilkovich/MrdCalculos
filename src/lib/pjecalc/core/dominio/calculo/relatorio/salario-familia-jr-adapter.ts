/**
 * PJe-Calc v2.15.1 — SalarioFamiliaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SalarioFamiliaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/SalarioFamiliaJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class SalarioFamiliaJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<SalarioFamiliaOcorrenciaAdapter>;
  abstract getQuantidadeDependentes(): number;
  abstract getTotalGeral(): Decimal;
}

export abstract class SalarioFamiliaOcorrenciaAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getValorPorCota(): Decimal;
  abstract getQuantidade(): number;
  abstract getValorDevido(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
}
