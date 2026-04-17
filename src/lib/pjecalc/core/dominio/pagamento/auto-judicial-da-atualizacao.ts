/**
 * PJe-Calc v2.15.1 — AutoJudicialDaAtualizacao (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.AutoJudicialDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/AutoJudicialDaAtualizacao.java (~229 linhas)
 */
import Decimal from 'decimal.js';
import type { AutoJudicial } from '../calculo/custas/auto-judicial';
import type { CustasJudiciaisDaAtualizacao } from './custas-judiciais-da-atualizacao';

const ZERO = new Decimal(0);

export class AutoJudicialDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private autoJudicial: AutoJudicial | null = null;
  private custasJudiciaisDaAtualizacao: CustasJudiciaisDaAtualizacao | null = null;
  private devido: Decimal = ZERO;
  private devidoCorrigido: Decimal = ZERO;
  private juros: Decimal = ZERO;
  private total: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private diferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getAutoJudicial(): AutoJudicial | null { return this.autoJudicial; }
  setAutoJudicial(a: AutoJudicial | null): void { this.autoJudicial = a; }

  getCustasJudiciaisDaAtualizacao(): CustasJudiciaisDaAtualizacao | null { return this.custasJudiciaisDaAtualizacao; }
  setCustasJudiciaisDaAtualizacao(c: CustasJudiciaisDaAtualizacao | null): void { this.custasJudiciaisDaAtualizacao = c; }

  getDevido(): Decimal { return this.devido; }
  setDevido(v: Decimal): void { this.devido = v; }

  getDevidoCorrigido(): Decimal { return this.devidoCorrigido; }
  setDevidoCorrigido(v: Decimal): void { this.devidoCorrigido = v; }

  getJuros(): Decimal { return this.juros; }
  setJuros(v: Decimal): void { this.juros = v; }

  getTotal(): Decimal { return this.total; }
  setTotal(v: Decimal): void { this.total = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDiferenca(): Decimal { return this.diferenca; }
  setDiferenca(v: Decimal): void { this.diferenca = v; }
}
