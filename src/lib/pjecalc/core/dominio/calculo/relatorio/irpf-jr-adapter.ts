/**
 * PJe-Calc v2.15.1 — IrpfJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/IrpfJRAdapter.java
 *
 * Demonstrativo de IRPF — ocorrências por competência com base, faixa,
 * aliquota, deducao, valor devido.
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class IrpfJRAdapter extends JRAdapter {
  abstract getOcorrencias(): JRAdapterDataSource<IrpfOcorrenciaAdapter>;
  abstract getTotalValorDevido(): Decimal;
  abstract getTotalBase(): Decimal;
  abstract getLegendaBasesNormal(): string;
  abstract getLegendaBasesExclusiva(): string;
  abstract getLegendaBasesSeparado(): string;
  abstract getLegendaBasesAnosAnteriores(): string;
}

export abstract class IrpfOcorrenciaAdapter extends JRAdapter {
  abstract getDataOcorrencia(): Date;
  abstract getTipo(): string; // N / S / E / A
  abstract getValorBase(): Decimal;
  abstract getValorVerbas(): Decimal;
  abstract getValorJuros(): Decimal;
  abstract getValorContribuicaoSocial(): Decimal;
  abstract getValorPrevidenciaPrivada(): Decimal;
  abstract getValorPensaoAlimenticia(): Decimal;
  abstract getValorHonorarios(): Decimal;
  abstract getValorDependentes(): Decimal;
  abstract getValorAposentadoMaiorQue65(): Decimal;
  abstract getValorInicialFaixa(): Decimal;
  abstract getValorFinalFaixa(): Decimal;
  abstract getValorAliquota(): Decimal;
  abstract getValorDeducao(): Decimal;
  abstract getValorDevido(): Decimal;
}
