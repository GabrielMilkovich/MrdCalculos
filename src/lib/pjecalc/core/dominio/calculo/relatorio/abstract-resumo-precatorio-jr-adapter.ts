/**
 * PJe-Calc v2.15.1 — AbstractResumoPrecatorioJrAdapter
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/AbstractResumoPrecatorioJrAdapter.java
 *
 * Resumo específico para precatórios (EC 136/2025 + regras de correção
 * "período da graça"). Valores separados por ano/período com índices próprios.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class AbstractResumoPrecatorioJrAdapter extends JRAdapter {
  abstract getGrupoEsferaPrecatorio(): string; // FEDERAL / ESTADUAL_MUNICIPAL
  abstract getTipoPrecatorio(): string;         // PRE / RPV
  abstract getDataInicioPeriodoDaGraca(): Date;
  abstract getDataFimPeriodoDaGraca(): Date;
  abstract getDataInicioAplicarEC1362025(): Date;

  abstract getOcorrencias(): JRAdapterDataSource<ResumoPrecatorioItemAdapter>;
  abstract getTotalValor(): Decimal;
  abstract getTotalCorrigido(): Decimal;
  abstract getTotalJuros(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class ResumoPrecatorioItemAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getIndiceIpca(): Decimal;
  abstract getIndiceSelic(): Decimal;
  abstract getIndicePrevaleceu(): string;
  abstract getValorCorrigido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getTotal(): Decimal;
}
