/**
 * PJe-Calc v2.15.1 — MultaDaAtualizacao (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/MultaDaAtualizacao.java (~493 linhas)
 *
 * Snapshot da Multa em uma atualização com valores diferença por categoria.
 */
import Decimal from 'decimal.js';
import type { Multa } from '../calculo/multa/multa';
import type { Pagamento } from './pagamento';

const ZERO = new Decimal(0);

export class MultaDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private multa: Multa | null = null;
  private pagamento: Pagamento | null = null;
  private dataEvento: Date | null = null;

  private devido: Decimal = ZERO;
  private devidoCorrigido: Decimal = ZERO;
  private juros: Decimal = ZERO;
  private total: Decimal = ZERO;
  private pago: Decimal = ZERO;
  private devidoDiferenca: Decimal = ZERO;
  private jurosDiferenca: Decimal = ZERO;
  private totalDiferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getMulta(): Multa | null { return this.multa; }
  setMulta(m: Multa | null): void { this.multa = m; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

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

  getDevidoDiferenca(): Decimal { return this.devidoDiferenca; }
  setDevidoDiferenca(v: Decimal): void { this.devidoDiferenca = v; }

  getJurosDiferenca(): Decimal { return this.jurosDiferenca; }
  setJurosDiferenca(v: Decimal): void { this.jurosDiferenca = v; }

  getTotalDiferenca(): Decimal { return this.totalDiferenca; }
  setTotalDiferenca(v: Decimal): void { this.totalDiferenca = v; }
}
