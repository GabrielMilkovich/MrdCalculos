/**
 * PJe-Calc v2.15.1 — OcorrenciaDeIrpfPagamento
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfPagamento
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/OcorrenciaDeIrpfPagamento.java (~333 linhas)
 *
 * Registro de pagamento de IRPF em uma data específica, com:
 *   - devido / juros / multa / total (originais)
 *   - pago (valor efetivo, limitado a total)
 *   - *Diferenca fields (remanescente após amortização)
 *   - flags pagamentoNoSaldo / calculadoNoSaldo
 *
 * Método principal: aplicarPagamento(pago) — distribui proporcionalmente e
 * preenche os campos *Diferenca.
 */
import Decimal from 'decimal.js';
import type { Irpf } from './irpf';

const ZERO = new Decimal(0);
const CEM = new Decimal(100);

export class OcorrenciaDeIrpfPagamento {
  private id: number | null = null;
  private irpf: Irpf | null = null;
  private dataEvento: Date | null = null;
  private dataPagamento: Date | null = null;
  private devido: Decimal = ZERO;
  private taxaJuros: Decimal = ZERO;
  private juros: Decimal = ZERO;
  private taxaMulta: Decimal = ZERO;
  private multa: Decimal = ZERO;
  private total: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private devidoDiferenca: Decimal = ZERO;
  private taxaJurosDiferenca: Decimal = ZERO;
  private jurosDiferenca: Decimal = ZERO;
  private taxaMultaDiferenca: Decimal = ZERO;
  private multaDiferenca: Decimal = ZERO;
  private totalDiferenca: Decimal = ZERO;
  private pagamentoNoSaldo: boolean = false;
  private calculadoNoSaldo: boolean = false;

  constructor(args?: {
    irpf: Irpf;
    devido: Decimal;
    taxaJuros: Decimal;
    taxaMulta: Decimal;
    dataEvento: Date;
    dataPagamento: Date;
  }) {
    if (args) {
      this.irpf = args.irpf;
      this.dataEvento = args.dataEvento;
      this.dataPagamento = args.dataPagamento;
      this.devido = args.devido;
      this.taxaJuros = args.taxaJuros;
      this.juros = args.taxaJuros.div(CEM).times(args.devido);
      this.taxaMulta = args.taxaMulta;
      this.multa = args.taxaMulta.div(CEM).times(args.devido);
      this.total = this.devido.plus(this.juros).plus(this.multa);
    }
  }

  /**
   * aplicarPagamento (Java linha 119) — amortiza `pago` (limitado a total) e
   * preenche *Diferenca. Se pago=0, diferenca = original integral.
   */
  aplicarPagamento(pago: Decimal): void {
    this.pago = pago.gt(this.total) ? this.total : pago;
    if (!this.pago.isZero() && !this.total.isZero()) {
      const proporcaoPago = this.pago.div(this.total);
      this.devidoDiferenca = this.devido.minus(this.devido.times(proporcaoPago));
      this.taxaJurosDiferenca = this.taxaJuros;
      this.jurosDiferenca = this.juros.minus(this.juros.times(proporcaoPago));
      this.taxaMultaDiferenca = this.taxaMulta;
      this.multaDiferenca = this.multa.minus(this.multa.times(proporcaoPago));
    } else {
      this.devidoDiferenca = this.devido;
      this.taxaJurosDiferenca = this.taxaJuros;
      this.jurosDiferenca = this.juros;
      this.taxaMultaDiferenca = this.taxaMulta;
      this.multaDiferenca = this.multa;
    }
    this.totalDiferenca = this.devidoDiferenca.plus(this.jurosDiferenca).plus(this.multaDiferenca);
  }

  getId(): number | null { return this.id; }

  getIrpf(): Irpf | null { return this.irpf; }
  setIrpf(v: Irpf | null): void { this.irpf = v; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getDataPagamento(): Date | null { return this.dataPagamento; }
  setDataPagamento(d: Date | null): void { this.dataPagamento = d; }

  getDevido(): Decimal { return this.devido; }
  setDevido(v: Decimal): void { this.devido = v; }

  getTaxaJuros(): Decimal { return this.taxaJuros; }
  setTaxaJuros(v: Decimal): void { this.taxaJuros = v; }

  getJuros(): Decimal { return this.juros; }
  setJuros(v: Decimal): void { this.juros = v; }

  getTaxaMulta(): Decimal { return this.taxaMulta; }
  setTaxaMulta(v: Decimal): void { this.taxaMulta = v; }

  getMulta(): Decimal { return this.multa; }
  setMulta(v: Decimal): void { this.multa = v; }

  getTotal(): Decimal { return this.total; }
  setTotal(v: Decimal): void { this.total = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDevidoDiferenca(): Decimal { return this.devidoDiferenca; }
  setDevidoDiferenca(v: Decimal): void { this.devidoDiferenca = v; }

  getTaxaJurosDiferenca(): Decimal { return this.taxaJurosDiferenca; }
  setTaxaJurosDiferenca(v: Decimal): void { this.taxaJurosDiferenca = v; }

  getJurosDiferenca(): Decimal { return this.jurosDiferenca; }
  setJurosDiferenca(v: Decimal): void { this.jurosDiferenca = v; }

  getTaxaMultaDiferenca(): Decimal { return this.taxaMultaDiferenca; }
  setTaxaMultaDiferenca(v: Decimal): void { this.taxaMultaDiferenca = v; }

  getMultaDiferenca(): Decimal { return this.multaDiferenca; }
  setMultaDiferenca(v: Decimal): void { this.multaDiferenca = v; }

  getTotalDiferenca(): Decimal { return this.totalDiferenca; }
  setTotalDiferenca(v: Decimal): void { this.totalDiferenca = v; }

  getPagamentoNoSaldo(): boolean { return this.pagamentoNoSaldo; }
  setPagamentoNoSaldo(v: boolean): void { this.pagamentoNoSaldo = v; }

  getCalculadoNoSaldo(): boolean { return this.calculadoNoSaldo; }
  setCalculadoNoSaldo(v: boolean): void { this.calculadoNoSaldo = v; }
}
