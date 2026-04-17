/**
 * PJe-Calc v2.15.1 — CustaPagaDaAtualizacao (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustaPagaDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/CustaPagaDaAtualizacao.java (~212 linhas)
 */
import Decimal from 'decimal.js';
import type { CustaPaga } from '../calculo/custas/custa-paga';
import type { CustasJudiciaisDaAtualizacao } from './custas-judiciais-da-atualizacao';

const ZERO = new Decimal(0);

export class CustaPagaDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private custaPaga: CustaPaga | null = null;
  private custasJudiciaisDaAtualizacao: CustasJudiciaisDaAtualizacao | null = null;
  private valorPago: Decimal = ZERO;
  private valorAtualizado: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustaPaga(): CustaPaga | null { return this.custaPaga; }
  setCustaPaga(c: CustaPaga | null): void { this.custaPaga = c; }

  getCustasJudiciaisDaAtualizacao(): CustasJudiciaisDaAtualizacao | null { return this.custasJudiciaisDaAtualizacao; }
  setCustasJudiciaisDaAtualizacao(c: CustasJudiciaisDaAtualizacao | null): void { this.custasJudiciaisDaAtualizacao = c; }

  getValorPago(): Decimal { return this.valorPago; }
  setValorPago(v: Decimal): void { this.valorPago = v; }

  getValorAtualizado(): Decimal { return this.valorAtualizado; }
  setValorAtualizado(v: Decimal): void { this.valorAtualizado = v; }
}
