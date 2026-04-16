/**
 * PJe-Calc v2.15.1 — EsocialInssFgtsJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/EsocialInssFgtsJRAdapter.java
 *
 * Demonstrativo específico para eSocial (integração com INSS e FGTS).
 * Agrega apenas os valores necessários para geração do arquivo eSocial.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class EsocialInssFgtsJRAdapter extends JRAdapter {
  abstract getOcorrenciasINSS(): JRAdapterDataSource<EsocialItemAdapter>;
  abstract getOcorrenciasFGTS(): JRAdapterDataSource<EsocialItemAdapter>;
  abstract getDataProcessamento(): Date;
  abstract getIdentificacaoEvento(): string;
}

export abstract class EsocialItemAdapter extends JRAdapter {
  abstract getCompetencia(): Date;
  abstract getBase(): Decimal;
  abstract getAliquota(): Decimal;
  abstract getValor(): Decimal;
  abstract getTipoRubrica(): string;
}
