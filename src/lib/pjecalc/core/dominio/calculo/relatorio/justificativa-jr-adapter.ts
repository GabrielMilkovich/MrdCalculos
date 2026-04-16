/**
 * PJe-Calc v2.15.1 — JustificativaJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/JustificativaJRAdapter.java
 *
 * Seção de justificativas (notas explicativas) do relatório do cálculo.
 */
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class JustificativaJRAdapter extends JRAdapter {
  abstract getJustificativas(): JRAdapterDataSource<JustificativaItemAdapter>;
}

export abstract class JustificativaItemAdapter extends JRAdapter {
  abstract getTitulo(): string;
  abstract getTexto(): string;
}
