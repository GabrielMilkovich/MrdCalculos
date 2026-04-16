/**
 * PJe-Calc v2.15.1 — InssJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/InssJRAdapter.java
 *
 * Demonstrativo de INSS sobre salários devidos + sobre salários pagos.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class InssJRAdapter extends JRAdapter {
  abstract getOcorrenciasSalariosDevidos(): JRAdapterDataSource<InssOcorrenciaAdapter>;
  abstract getOcorrenciasSalariosPagos(): JRAdapterDataSource<InssOcorrenciaAdapter>;
  abstract getTotalSegurado(): Decimal;
  abstract getTotalEmpresa(): Decimal;
  abstract getTotalSAT(): Decimal;
  abstract getTotalTerceiros(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class InssOcorrenciaAdapter extends JRAdapter {
  abstract getDataOcorrencia(): Date;
  abstract getBase(): Decimal;
  abstract getAliquotaSegurado(): Decimal;
  abstract getValorSegurado(): Decimal;
  abstract getAliquotaEmpresa(): Decimal;
  abstract getValorEmpresa(): Decimal;
  abstract getAliquotaSAT(): Decimal;
  abstract getValorSAT(): Decimal;
  abstract getAliquotaTerceiros(): Decimal;
  abstract getValorTerceiros(): Decimal;
  abstract getTaxaDeJuros(): Decimal;
  abstract getTotal(): Decimal;
}
