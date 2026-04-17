/**
 * PJe-Calc v2.15.1 — IrpfHonorariosAtualizacaoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfHonorariosAtualizacaoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../relatorio/IrpfHonorariosAtualizacaoJRAdapter.java
 *
 * Relatório de IRPF aplicado sobre honorários em atualização (faixas PF/PJ).
 */
import type Decimal from 'decimal.js';
import { JRAdapter, JRAdapterDataSource } from './jr-adapter';

export abstract class IrpfHonorariosAtualizacaoJRAdapter extends JRAdapter {
  abstract getHonorariosAtualizados(): JRAdapterDataSource<IrpfHonorariosAtualizacaoItemAdapter>;
  abstract getTotalBaseImposto(): Decimal;
  abstract getTotalValorImpostoRenda(): Decimal;
}

export abstract class IrpfHonorariosAtualizacaoItemAdapter extends JRAdapter {
  abstract getDataEvento(): Date;
  abstract getDescricao(): string;
  abstract getTipoImpostoRenda(): string; // PF / PJ
  abstract getBaseImposto(): Decimal;
  abstract getValorInicialFaixa(): Decimal;
  abstract getValorFinalFaixa(): Decimal;
  abstract getValorAliquota(): Decimal;
  abstract getValorDeducao(): Decimal;
  abstract getValorImpostoRenda(): Decimal;
}
