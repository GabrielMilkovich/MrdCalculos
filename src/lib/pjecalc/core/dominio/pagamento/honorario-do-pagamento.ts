/**
 * PJe-Calc v2.15.1 — HonorarioDoPagamento
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/HonorarioDoPagamento.java
 *
 * Vínculo Honorário ↔ Pagamento com tipo de vínculo (3 opções) + valor +
 * flag apurarHonorario. Clonagem por construtor.
 */
import type Decimal from 'decimal.js';
import { TipoVinculoDeHonorarioDoPagamentoEnum } from '../../constantes/enums';
import type { Honorario } from '../calculo/honorarios/honorario';
import type { Pagamento } from './pagamento';

export class HonorarioDoPagamento {
  private id: number | null = null;
  private honorario: Honorario | null = null;
  private pagamento: Pagamento | null = null;
  private tipoVinculo: TipoVinculoDeHonorarioDoPagamentoEnum = TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE;
  private apurarHonorario: boolean = true;
  private valorHonorario: Decimal | null = null;

  constructor(args?: HonorarioDoPagamento | {
    honorario: Honorario | null;
    pagamento: Pagamento | null;
    valorHonorario: Decimal | null;
    apurarHonorario: boolean;
    tipoVinculo: TipoVinculoDeHonorarioDoPagamentoEnum;
  }) {
    if (!args) return;
    if (args instanceof HonorarioDoPagamento) {
      this.honorario = args.getHonorario();
      this.pagamento = args.getPagamento();
      this.valorHonorario = args.getValorHonorario();
      this.apurarHonorario = args.getApurarHonorario();
      this.tipoVinculo = args.getTipoVinculo();
    } else {
      this.honorario = args.honorario;
      this.pagamento = args.pagamento;
      this.valorHonorario = args.valorHonorario;
      this.apurarHonorario = args.apurarHonorario;
      this.tipoVinculo = args.tipoVinculo;
    }
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getHonorario(): Honorario | null { return this.honorario; }
  setHonorario(h: Honorario | null): void { this.honorario = h; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getTipoVinculo(): TipoVinculoDeHonorarioDoPagamentoEnum { return this.tipoVinculo; }
  setTipoVinculo(v: TipoVinculoDeHonorarioDoPagamentoEnum): void { this.tipoVinculo = v; }

  getValorHonorario(): Decimal | null { return this.valorHonorario; }
  setValorHonorario(v: Decimal | null): void { this.valorHonorario = v; }

  getApurarHonorario(): boolean { return this.apurarHonorario; }
  setApurarHonorario(v: boolean): void { this.apurarHonorario = v; }
}
