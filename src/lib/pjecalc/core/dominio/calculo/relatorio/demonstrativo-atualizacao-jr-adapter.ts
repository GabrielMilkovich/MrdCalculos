/**
 * PJe-Calc v2.15.1 — DemonstrativoAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/DemonstrativoAtualizacaoJRAdapter.java
 *
 * Demonstrativo pós-liquidação mostrando, por evento de atualização, os
 * valores atualizados dos créditos/débitos do reclamante.
 */
import type { Periodo } from '../../../base/comum/periodo';
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class DemonstrativoAtualizacaoJRAdapter extends JRAdapter {
  abstract getEventos(): JRAdapterDataSource<DemonstrativoAtualizacaoEventoAdapter>;
  abstract getPeriodo(): Periodo;
  abstract getTotalAtualizado(): Decimal;
}

export abstract class DemonstrativoAtualizacaoEventoAdapter extends JRAdapter {
  abstract getDataEvento(): Date;
  abstract getDescricaoEvento(): string;
  abstract getValorOriginal(): Decimal;
  abstract getIndiceCorrecao(): Decimal;
  abstract getValorCorrigido(): Decimal;
  abstract getJuros(): Decimal;
  abstract getTotal(): Decimal;
  abstract getPago(): Decimal;
  abstract getDiferenca(): Decimal;
}
