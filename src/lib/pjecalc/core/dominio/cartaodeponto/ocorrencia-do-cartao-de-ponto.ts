/**
 * PJe-Calc v2.15.1 — OcorrenciaDoCartaoDePonto
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/OcorrenciaDoCartaoDePonto.java (~134 linhas)
 *
 * Linha do cartão-ponto: data da ocorrência + valor (em horas ou millis).
 * Implementa `Comparable` ordenando por `dataOcorrencia`.
 */
import type Decimal from 'decimal.js';
import type { CartaoDePonto } from './cartao-de-ponto';

export class OcorrenciaDoCartaoDePonto {
  private id: number | null = null;
  private versao: number = 0;
  private cartaoDePonto: CartaoDePonto | null = null;
  private dataOcorrencia: Date | null = null;
  private valor: Decimal | null = null;

  constructor(
    cartaoDePonto: CartaoDePonto | null = null,
    dataOcorrencia: Date | null = null,
    valor: Decimal | null = null,
  ) {
    this.cartaoDePonto = cartaoDePonto;
    this.dataOcorrencia = dataOcorrencia;
    this.valor = valor;
  }

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCartaoDePonto(): CartaoDePonto | null { return this.cartaoDePonto; }
  setCartaoDePonto(c: CartaoDePonto | null): void { this.cartaoDePonto = c; }

  getDataOcorrencia(): Date | null { return this.dataOcorrencia; }
  setDataOcorrencia(d: Date | null): void { this.dataOcorrencia = d; }

  getValor(): Decimal | null { return this.valor; }
  setValor(v: Decimal | null): void { this.valor = v; }

  /** compareTo — ordena por dataOcorrencia. */
  compareTo(o: OcorrenciaDoCartaoDePonto): number {
    const a = this.dataOcorrencia;
    const b = o.getDataOcorrencia();
    if (!a || !b) return 0;
    return a.getTime() - b.getTime();
  }
}
