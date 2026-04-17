/**
 * PJe-Calc v2.15.1 — PensaoAlimenticiaDaAtualizacao (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.PensaoAlimenticiaDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/PensaoAlimenticiaDaAtualizacao.java (~304 linhas)
 *
 * Snapshot de pensão alimentícia em uma atualização. Campos essenciais para
 * rateio de pensão sobre juros do período.
 */
import Decimal from 'decimal.js';
import type { Pagamento } from './pagamento';

const ZERO = new Decimal(0);

export class PensaoAlimenticiaDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private pagamento: Pagamento | null = null;
  private dataEvento: Date | null = null;

  private base: Decimal = ZERO;
  private aliquota: Decimal = ZERO;
  private devido: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private diferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getBase(): Decimal { return this.base; }
  setBase(v: Decimal): void { this.base = v; }

  getAliquota(): Decimal { return this.aliquota; }
  setAliquota(v: Decimal): void { this.aliquota = v; }

  getDevido(): Decimal { return this.devido; }
  setDevido(v: Decimal): void { this.devido = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDiferenca(): Decimal { return this.diferenca; }
  setDiferenca(v: Decimal): void { this.diferenca = v; }
}
