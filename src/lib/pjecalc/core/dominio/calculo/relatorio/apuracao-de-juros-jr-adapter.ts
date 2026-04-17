/**
 * PJe-Calc v2.15.1 — ApuracaoDeJurosJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/ApuracaoDeJurosJRAdapter.java
 *
 * Demonstrativo mês a mês da apuração de juros de mora (capital + juros).
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class ApuracaoDeJurosJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<ApuracaoDeJurosOcorrenciaAdapter>;
  abstract getTotalCapital(): Decimal;
  abstract getTotalJuros(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class ApuracaoDeJurosOcorrenciaAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getDataInicial(): Date;
  abstract getValorCorrigido(): Decimal;
  abstract getContribuicaoSocial(): Decimal;
  abstract getPrevidenciaPrivada(): Decimal;
  abstract getCapital(): Decimal;
  abstract getTaxaDeJuros(): Decimal;
  abstract getJuros(): Decimal;
  abstract getTotal(): Decimal;
}
