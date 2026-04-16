/**
 * PJe-Calc v2.15.1 — CustasFixasDaAtualizacaoDoEvento (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasFixasDaAtualizacaoDoEvento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/CustasFixasDaAtualizacaoDoEvento.java (~525 linhas)
 *
 * Snapshot de custas fixas em uma atualização de evento. 9 categorias × {qtde, valor}.
 */
import Decimal from 'decimal.js';
import type { CustasFixasAtualizacao } from '../calculo/custas/custas-fixas-atualizacao';
import type { CustasJudiciaisDaAtualizacao } from './custas-judiciais-da-atualizacao';

const ZERO = new Decimal(0);

export class CustasFixasDaAtualizacaoDoEvento {
  private id: number | null = null;
  private versao: number = 0;
  private custasFixasAtualizacao: CustasFixasAtualizacao | null = null;
  private custasJudiciaisDaAtualizacao: CustasJudiciaisDaAtualizacao | null = null;

  private totalDevido: Decimal = ZERO;
  private totalDevidoCorrigido: Decimal = ZERO;
  private juros: Decimal = ZERO;
  private total: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private diferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasFixasAtualizacao(): CustasFixasAtualizacao | null { return this.custasFixasAtualizacao; }
  setCustasFixasAtualizacao(v: CustasFixasAtualizacao | null): void { this.custasFixasAtualizacao = v; }

  getCustasJudiciaisDaAtualizacao(): CustasJudiciaisDaAtualizacao | null { return this.custasJudiciaisDaAtualizacao; }
  setCustasJudiciaisDaAtualizacao(c: CustasJudiciaisDaAtualizacao | null): void { this.custasJudiciaisDaAtualizacao = c; }

  getTotalDevido(): Decimal { return this.totalDevido; }
  setTotalDevido(v: Decimal): void { this.totalDevido = v; }

  getTotalDevidoCorrigido(): Decimal { return this.totalDevidoCorrigido; }
  setTotalDevidoCorrigido(v: Decimal): void { this.totalDevidoCorrigido = v; }

  getJuros(): Decimal { return this.juros; }
  setJuros(v: Decimal): void { this.juros = v; }

  getTotal(): Decimal { return this.total; }
  setTotal(v: Decimal): void { this.total = v; }

  getPago(): Decimal { return this.pago; }
  setPago(v: Decimal): void { this.pago = v; }

  getDiferenca(): Decimal { return this.diferenca; }
  setDiferenca(v: Decimal): void { this.diferenca = v; }
}
