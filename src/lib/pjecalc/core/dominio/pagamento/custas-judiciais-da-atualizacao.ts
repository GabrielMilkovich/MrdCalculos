/**
 * PJe-Calc v2.15.1 — CustasJudiciaisDaAtualizacao (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/CustasJudiciaisDaAtualizacao.java (~2185 linhas)
 *
 * Maior entidade de atualização. Consolida, por evento, os valores das custas
 * (conhecimento/liquidação/fixas), autos judiciais, armazenamento, custas pagas
 * e a apuração de diferenças.
 *
 * **Status**: stub mínimo. Por ser um data holder com centenas de campos
 * repetitivos, a implementação completa é adiada para quando o sistema
 * precisar de relatórios financeiros detalhados.
 */
import Decimal from 'decimal.js';
import type { CustasJudiciais } from '../calculo/custas/custas-judiciais';
import type { Pagamento } from './pagamento';

const ZERO = new Decimal(0);

export class CustasJudiciaisDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private custasJudiciais: CustasJudiciais | null = null;
  private pagamento: Pagamento | null = null;
  private dataEvento: Date | null = null;

  // Totais consolidados para fins de amortização
  private totalDevidoConhecimentoReclamante: Decimal = ZERO;
  private totalDevidoConhecimentoReclamado: Decimal = ZERO;
  private totalDevidoLiquidacao: Decimal = ZERO;
  private totalDevidoCustasFixas: Decimal = ZERO;
  private totalDevidoAutos: Decimal = ZERO;
  private totalDevidoArmazenamento: Decimal = ZERO;

  private totalPago: Decimal = ZERO;
  private totalDiferenca: Decimal = ZERO;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCustasJudiciais(): CustasJudiciais | null { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais | null): void { this.custasJudiciais = c; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getTotalDevidoConhecimentoReclamante(): Decimal { return this.totalDevidoConhecimentoReclamante; }
  setTotalDevidoConhecimentoReclamante(v: Decimal): void { this.totalDevidoConhecimentoReclamante = v; }

  getTotalDevidoConhecimentoReclamado(): Decimal { return this.totalDevidoConhecimentoReclamado; }
  setTotalDevidoConhecimentoReclamado(v: Decimal): void { this.totalDevidoConhecimentoReclamado = v; }

  getTotalDevidoLiquidacao(): Decimal { return this.totalDevidoLiquidacao; }
  setTotalDevidoLiquidacao(v: Decimal): void { this.totalDevidoLiquidacao = v; }

  getTotalDevidoCustasFixas(): Decimal { return this.totalDevidoCustasFixas; }
  setTotalDevidoCustasFixas(v: Decimal): void { this.totalDevidoCustasFixas = v; }

  getTotalDevidoAutos(): Decimal { return this.totalDevidoAutos; }
  setTotalDevidoAutos(v: Decimal): void { this.totalDevidoAutos = v; }

  getTotalDevidoArmazenamento(): Decimal { return this.totalDevidoArmazenamento; }
  setTotalDevidoArmazenamento(v: Decimal): void { this.totalDevidoArmazenamento = v; }

  getTotalPago(): Decimal { return this.totalPago; }
  setTotalPago(v: Decimal): void { this.totalPago = v; }

  getTotalDiferenca(): Decimal { return this.totalDiferenca; }
  setTotalDiferenca(v: Decimal): void { this.totalDiferenca = v; }
}
