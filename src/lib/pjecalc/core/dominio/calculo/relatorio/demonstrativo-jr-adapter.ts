/**
 * PJe-Calc v2.15.1 — DemonstrativoJRAdapter (abstract) + nested adapters
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/DemonstrativoJRAdapter.java
 *
 * Demonstrativo de verbas do cálculo:
 *   - Por verba: nome, periodo, incidencia, formula, totalDoValorCorrigido
 *   - Por ocorrência da verba: periodo, base, div/mult/qty, dobra, devido,
 *     pago, diferenca, indiceAcumulado, valorCorrigido
 *
 * Subclasses concretas: `DemonstrativoJRAdapterPadrao`, `DemonstrativoJRAdapterScript`.
 */
import type Decimal from 'decimal.js';
import type { Periodo } from '../../../base/comum/periodo';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class DemonstrativoJRAdapter extends JRAdapter {
  abstract getVerbas(): JRAdapterDataSource<DemonstrativoVerbaAdapter>;
}

export abstract class DemonstrativoOcorrenciaAdapter extends JRAdapter {
  abstract getPeriodo(): Periodo;
  abstract getBase(): Decimal;
  abstract getDivisor(): Decimal;
  abstract getMultiplicador(): Decimal;
  abstract getQuantidade(): Decimal;
  abstract getDobra(): string;
  abstract getDevido(): Decimal;
  abstract getPago(): Decimal;
  abstract getDiferenca(): Decimal;
  abstract getIndiceAcumulado(): Decimal;
  abstract getValorCorrigido(): Decimal;
}

export abstract class DemonstrativoVerbaAdapter extends JRAdapter {
  abstract getNome(): string;
  abstract getPeriodo(): Periodo;
  abstract getIncidencia(): string;
  abstract getComentario(): string;
  abstract getFormula(): string;
  abstract getTotalDoValorCorrigido(): Decimal;
  abstract getOcorrencias(): JRAdapterDataSource<DemonstrativoOcorrenciaAdapter>;
}
