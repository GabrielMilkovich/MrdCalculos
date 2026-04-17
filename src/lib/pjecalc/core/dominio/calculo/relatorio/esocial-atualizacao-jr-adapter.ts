/**
 * PJe-Calc v2.15.1 — EsocialAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/EsocialAtualizacaoJRAdapter.java
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class EsocialAtualizacaoJRAdapter extends JRAdapter {
  abstract getOcorrenciasINSS(): JRAdapterDataSource<EsocialAtualizacaoItemAdapter>;
  abstract getOcorrenciasFGTS(): JRAdapterDataSource<EsocialAtualizacaoItemAdapter>;
  abstract getDataProcessamento(): Date;
  abstract getIdentificacaoEvento(): string;
}

export abstract class EsocialAtualizacaoItemAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getAliquota(): Decimal;
  abstract getValorOriginal(): Decimal;
  abstract getValorCorrigido(): Decimal;
  abstract getTipoRubrica(): string;
}
