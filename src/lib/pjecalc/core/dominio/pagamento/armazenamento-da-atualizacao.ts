/**
 * PJe-Calc v2.15.1 — ArmazenamentoDaAtualizacao (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.ArmazenamentoDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/ArmazenamentoDaAtualizacao.java (~243 linhas)
 */
import Decimal from 'decimal.js';
import type { Armazenamento } from '../calculo/custas/armazenamento';
import type { CustasJudiciaisDaAtualizacao } from './custas-judiciais-da-atualizacao';

const ZERO = new Decimal(0);

export class ArmazenamentoDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private armazenamento: Armazenamento | null = null;
  private custasJudiciaisDaAtualizacao: CustasJudiciaisDaAtualizacao | null = null;
  private valorDevido: Decimal = ZERO;
  private valorDevidoCorrigido: Decimal = ZERO;
  private juros: Decimal = ZERO;
  private total: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private diferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getArmazenamento(): Armazenamento | null { return this.armazenamento; }
  setArmazenamento(a: Armazenamento | null): void { this.armazenamento = a; }

  getCustasJudiciaisDaAtualizacao(): CustasJudiciaisDaAtualizacao | null { return this.custasJudiciaisDaAtualizacao; }
  setCustasJudiciaisDaAtualizacao(c: CustasJudiciaisDaAtualizacao | null): void { this.custasJudiciaisDaAtualizacao = c; }

  getValorDevido(): Decimal { return this.valorDevido; }
  setValorDevido(v: Decimal): void { this.valorDevido = v; }

  getValorDevidoCorrigido(): Decimal { return this.valorDevidoCorrigido; }
  setValorDevidoCorrigido(v: Decimal): void { this.valorDevidoCorrigido = v; }

  getJuros(): Decimal { return this.juros; }
  setJuros(v: Decimal): void { this.juros = v; }

  getTotal(): Decimal { return this.total; }
  setTotal(v: Decimal): void { this.total = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDiferenca(): Decimal { return this.diferenca; }
  setDiferenca(v: Decimal): void { this.diferenca = v; }
}
