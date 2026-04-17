/**
 * PJe-Calc v2.15.1 — CustaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/CustaJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class CustaJRAdapter extends JRAdapter {
  abstract getCustasConhecimentoReclamante(): Decimal;
  abstract getCustasConhecimentoReclamado(): Decimal;
  abstract getCustasLiquidacao(): Decimal;
  abstract getCustasFixas(): JRAdapterDataSource<CustaFixaAdapter>;
  abstract getAutosJudiciais(): JRAdapterDataSource<AutoJudicialAdapter>;
  abstract getArmazenamentos(): JRAdapterDataSource<ArmazenamentoAdapter>;
  abstract getCustasPagasReclamante(): JRAdapterDataSource<CustaPagaAdapter>;
  abstract getCustasPagasReclamado(): JRAdapterDataSource<CustaPagaAdapter>;
  abstract getTotalGeral(): Decimal;
}

export abstract class CustaFixaAdapter extends JRAdapter {
  abstract getTipo(): string;
  abstract getQuantidade(): number;
  abstract getValor(): Decimal;
  abstract getValorCorrigido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getTotal(): Decimal;
}

export abstract class AutoJudicialAdapter extends JRAdapter {
  abstract getTipoDeAuto(): string;
  abstract getValorAvaliacao(): Decimal;
  abstract getDataVencimento(): Date;
  abstract getValorCustas(): Decimal;
  abstract getTotal(): Decimal;
}

export abstract class ArmazenamentoAdapter extends JRAdapter {
  abstract getDescricao(): string;
  abstract getDataInicio(): Date;
  abstract getDataFim(): Date;
  abstract getValorDiaria(): Decimal;
  abstract getValorTotal(): Decimal;
  abstract getValorCorrigido(): Decimal;
}

export abstract class CustaPagaAdapter extends JRAdapter {
  abstract getDescricao(): string;
  abstract getDataVencimento(): Date;
  abstract getValorPago(): Decimal;
}
