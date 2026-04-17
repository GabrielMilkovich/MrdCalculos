/**
 * PJe-Calc v2.15.1 — MultaDoPagamento
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/MultaDoPagamento.java
 *
 * Vínculo Multa ↔ Pagamento (3 tipos de vínculo) com valor + apurarMulta.
 */
import type Decimal from 'decimal.js';
import { TipoVinculoDeMultaDoPagamentoEnum } from '../../constantes/enums';
import type { Multa } from '../calculo/multa/multa';
import type { Pagamento } from './pagamento';

export class MultaDoPagamento {
  private id: number | null = null;
  private multa: Multa | null = null;
  private pagamento: Pagamento | null = null;
  private tipoVinculo: TipoVinculoDeMultaDoPagamentoEnum = TipoVinculoDeMultaDoPagamentoEnum.DEBITOSRECLAMANTE;
  private apurarMulta: boolean = true;
  private valorMulta: Decimal | null = null;

  constructor(args?: MultaDoPagamento | {
    multa: Multa | null;
    pagamento: Pagamento | null;
    valorMulta: Decimal | null;
    apurarMulta: boolean;
    tipoVinculo: TipoVinculoDeMultaDoPagamentoEnum;
  }) {
    if (!args) return;
    if (args instanceof MultaDoPagamento) {
      this.multa = args.getMulta();
      this.pagamento = args.getPagamento();
      this.valorMulta = args.getValorMulta();
      this.apurarMulta = args.getApurarMulta();
      this.tipoVinculo = args.getTipoVinculo();
    } else {
      this.multa = args.multa;
      this.pagamento = args.pagamento;
      this.valorMulta = args.valorMulta;
      this.apurarMulta = args.apurarMulta;
      this.tipoVinculo = args.tipoVinculo;
    }
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getMulta(): Multa | null { return this.multa; }
  setMulta(m: Multa | null): void { this.multa = m; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getTipoVinculo(): TipoVinculoDeMultaDoPagamentoEnum { return this.tipoVinculo; }
  setTipoVinculo(v: TipoVinculoDeMultaDoPagamentoEnum): void { this.tipoVinculo = v; }

  getValorMulta(): Decimal | null { return this.valorMulta; }
  setValorMulta(v: Decimal | null): void { this.valorMulta = v; }

  getApurarMulta(): boolean { return this.apurarMulta; }
  setApurarMulta(v: boolean): void { this.apurarMulta = v; }
}
