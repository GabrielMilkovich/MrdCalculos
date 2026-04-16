/**
 * PJe-Calc v2.15.1 — FGTSJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.FGTSJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/FGTSJRAdapter.java
 *
 * Demonstrativo de FGTS — depósitos, sacados, multa 40%, indenização
 * Art. 467, saldo acumulado, compor principal etc.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class FGTSJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<FGTSOcorrenciaAdapter>;
  abstract getTotalDepositado(): Decimal;
  abstract getTotalSacado(): Decimal;
  abstract getTotalDoFgts(): Decimal;
  abstract getTotalMultaFgts(): Decimal;
  abstract getTotalMultaArt467(): Decimal;
  abstract getTotalGeral(): Decimal;
}

export abstract class FGTSOcorrenciaAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getAliquota(): Decimal;
  abstract getDevidoFgts(): Decimal;
  abstract getPagoFgts(): Decimal;
  abstract getDiferenca(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
}
