/**
 * PJe-Calc v2.15.1 — Pagamento (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/Pagamento.java (~1643 linhas)
 *
 * Entidade que representa um pagamento efetivado pelo reclamado. Implementa
 * EventoAtualizacao (prioridade 5, depois de custas/honor/multa). Agrega:
 *   - Cabeçalho: dataCriacao, dataPagamento, pagarPrecatorio, valorPagamento
 *   - Parcelas: valorParcelaCreditoReclamante, valorParcelaPrincipal,
 *     valorParcelaFgts, valorParcelaMultasDevidasReclamante
 *   - Flags apurarXxx (Principal / Fgts / MultasDevidasRclmnte/Rclmdo /
 *     CustasJudiciais / RecolherDebitosReclamante / priorizarPagamentoDeJuros)
 *   - custasJudiciais (BigDecimal)
 *   - Coleções de vínculo:
 *     honorariosBrutosDevidosReclamante (DEBITOSRECLAMANTE)
 *     honorariosBrutosDevidosReclamadoOutrosDebitos (OUTROSDEBITOSRECLAMADO)
 *     honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante (DEBITOSCOBRAR)
 *     multasDevidasTerceiros (DEBITOSRECLAMANTE)
 *     multasDevidasTerceirosOutrosDebitos (OUTROSDEBITOSRECLAMADO)
 *     multasDevidasTerceirosDebitosCobrarDoReclamante (DEBITOSCOBRAR)
 *
 * **Status**: stub estrutural com campos + coleções. Lógica de rateio
 * em MaquinaDeRateioDoPagamento (também stub).
 */
import type Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import type { EventoAtualizacao } from './evento-atualizacao';
import type { HonorarioDoPagamento } from './honorario-do-pagamento';
import type { MultaDoPagamento } from './multa-do-pagamento';

export class Pagamento implements EventoAtualizacao {
  static readonly PRIORIDADE_ATUALIZACAO = 5;
  static readonly TITULO_DEBITOS_COBRAR_RECLAMANTE = 'Débitos do Reclamante';
  static readonly TITULO_OUTROS_DEBITOS_RECLAMADO = 'Outros Débitos do Reclamado';
  static readonly TITULO_CREDITOS_RECLAMANTE = 'Créditos do Reclamante';

  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private dataCriacao: Date | null = null;
  private dataPagamento: Date | null = null;
  private pagarPrecatorio: boolean = false;
  private valorPagamento: Decimal | null = null;
  private valorParcelaCreditoReclamante: Decimal | null = null;

  private apurarValorPrincipal: boolean = false;
  private valorParcelaPrincipal: Decimal | null = null;
  private apurarValorFgts: boolean = false;
  private valorParcelaFgts: Decimal | null = null;
  private apurarValorMultasDevidasReclamante: boolean = false;
  private valorParcelaMultasDevidasReclamante: Decimal | null = null;
  private apurarValorMultasDevidasReclamado: boolean = false;

  private priorizarPagamentoDeJuros: boolean = false;
  private recolherDebitosReclamante: boolean = false;
  private apurarCustasJudiciais: boolean = false;
  private custasJudiciais: Decimal | null = null;

  // Coleções — tipos de vínculo distintos
  private honorariosBrutosDevidosReclamante: Set<HonorarioDoPagamento> = new Set();
  private honorariosBrutosDevidosReclamadoOutrosDebitos: Set<HonorarioDoPagamento> = new Set();
  private honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante: Set<HonorarioDoPagamento> = new Set();

  private multasDevidasTerceiros: Set<MultaDoPagamento> = new Set();
  private multasDevidasTerceirosOutrosDebitos: Set<MultaDoPagamento> = new Set();
  private multasDevidasTerceirosDebitosCobrarDoReclamante: Set<MultaDoPagamento> = new Set();

  // transient
  private selecionarValorPrincipal: boolean = false;
  private selecionarValorFgts: boolean = false;
  private selecionarValorMultasDevidasReclamante: boolean = false;
  private selecionarValorMultasDevidasReclamado: boolean = false;
  private selecionarCustasJudiciais: boolean = false;
  private dispararExcecoesNaValidacao: boolean = true;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataCriacao(): Date | null { return this.dataCriacao; }
  setDataCriacao(d: Date | null): void { this.dataCriacao = d; }

  getDataPagamento(): Date | null { return this.dataPagamento; }
  setDataPagamento(d: Date | null): void { this.dataPagamento = d; }

  getPagarPrecatorio(): boolean { return this.pagarPrecatorio; }
  setPagarPrecatorio(v: boolean): void { this.pagarPrecatorio = v; }

  getValorPagamento(): Decimal | null { return this.valorPagamento; }
  setValorPagamento(v: Decimal | null): void { this.valorPagamento = v; }

  getValorParcelaCreditoReclamante(): Decimal | null { return this.valorParcelaCreditoReclamante; }
  setValorParcelaCreditoReclamante(v: Decimal | null): void { this.valorParcelaCreditoReclamante = v; }

  getApurarValorPrincipal(): boolean { return this.apurarValorPrincipal; }
  setApurarValorPrincipal(v: boolean): void { this.apurarValorPrincipal = v; }

  getValorParcelaPrincipal(): Decimal | null { return this.valorParcelaPrincipal; }
  setValorParcelaPrincipal(v: Decimal | null): void { this.valorParcelaPrincipal = v; }

  getApurarValorFgts(): boolean { return this.apurarValorFgts; }
  setApurarValorFgts(v: boolean): void { this.apurarValorFgts = v; }

  getValorParcelaFgts(): Decimal | null { return this.valorParcelaFgts; }
  setValorParcelaFgts(v: Decimal | null): void { this.valorParcelaFgts = v; }

  getApurarValorMultasDevidasReclamante(): boolean { return this.apurarValorMultasDevidasReclamante; }
  setApurarValorMultasDevidasReclamante(v: boolean): void { this.apurarValorMultasDevidasReclamante = v; }

  getValorParcelaMultasDevidasReclamante(): Decimal | null { return this.valorParcelaMultasDevidasReclamante; }
  setValorParcelaMultasDevidasReclamante(v: Decimal | null): void { this.valorParcelaMultasDevidasReclamante = v; }

  getApurarValorMultasDevidasReclamado(): boolean { return this.apurarValorMultasDevidasReclamado; }
  setApurarValorMultasDevidasReclamado(v: boolean): void { this.apurarValorMultasDevidasReclamado = v; }

  getPriorizarPagamentoDeJuros(): boolean { return this.priorizarPagamentoDeJuros; }
  setPriorizarPagamentoDeJuros(v: boolean): void { this.priorizarPagamentoDeJuros = v; }

  getRecolherDebitosReclamante(): boolean { return this.recolherDebitosReclamante; }
  setRecolherDebitosReclamante(v: boolean): void { this.recolherDebitosReclamante = v; }

  getApurarCustasJudiciais(): boolean { return this.apurarCustasJudiciais; }
  setApurarCustasJudiciais(v: boolean): void { this.apurarCustasJudiciais = v; }

  getCustasJudiciais(): Decimal | null { return this.custasJudiciais; }
  setCustasJudiciais(v: Decimal | null): void { this.custasJudiciais = v; }

  getHonorariosBrutosDevidosReclamante(): Set<HonorarioDoPagamento> {
    return this.honorariosBrutosDevidosReclamante;
  }
  setHonorariosBrutosDevidosReclamante(s: Set<HonorarioDoPagamento>): void {
    this.honorariosBrutosDevidosReclamante = s;
  }

  getHonorariosBrutosDevidosReclamadoOutrosDebitos(): Set<HonorarioDoPagamento> {
    return this.honorariosBrutosDevidosReclamadoOutrosDebitos;
  }
  setHonorariosBrutosDevidosReclamadoOutrosDebitos(s: Set<HonorarioDoPagamento>): void {
    this.honorariosBrutosDevidosReclamadoOutrosDebitos = s;
  }

  getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante(): Set<HonorarioDoPagamento> {
    return this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante;
  }
  setHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante(s: Set<HonorarioDoPagamento>): void {
    this.honorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante = s;
  }

  getMultasDevidasTerceiros(): Set<MultaDoPagamento> {
    return this.multasDevidasTerceiros;
  }
  setMultasDevidasTerceiros(s: Set<MultaDoPagamento>): void {
    this.multasDevidasTerceiros = s;
  }

  getMultasDevidasTerceirosOutrosDebitos(): Set<MultaDoPagamento> {
    return this.multasDevidasTerceirosOutrosDebitos;
  }
  setMultasDevidasTerceirosOutrosDebitos(s: Set<MultaDoPagamento>): void {
    this.multasDevidasTerceirosOutrosDebitos = s;
  }

  getMultasDevidasTerceirosDebitosCobrarDoReclamante(): Set<MultaDoPagamento> {
    return this.multasDevidasTerceirosDebitosCobrarDoReclamante;
  }
  setMultasDevidasTerceirosDebitosCobrarDoReclamante(s: Set<MultaDoPagamento>): void {
    this.multasDevidasTerceirosDebitosCobrarDoReclamante = s;
  }

  // transient
  getSelecionarValorPrincipal(): boolean { return this.selecionarValorPrincipal; }
  setSelecionarValorPrincipal(v: boolean): void { this.selecionarValorPrincipal = v; }

  getSelecionarValorFgts(): boolean { return this.selecionarValorFgts; }
  setSelecionarValorFgts(v: boolean): void { this.selecionarValorFgts = v; }

  getSelecionarValorMultasDevidasReclamante(): boolean { return this.selecionarValorMultasDevidasReclamante; }
  setSelecionarValorMultasDevidasReclamante(v: boolean): void { this.selecionarValorMultasDevidasReclamante = v; }

  getSelecionarValorMultasDevidasReclamado(): boolean { return this.selecionarValorMultasDevidasReclamado; }
  setSelecionarValorMultasDevidasReclamado(v: boolean): void { this.selecionarValorMultasDevidasReclamado = v; }

  getSelecionarCustasJudiciais(): boolean { return this.selecionarCustasJudiciais; }
  setSelecionarCustasJudiciais(v: boolean): void { this.selecionarCustasJudiciais = v; }

  getDispararExcecoesNaValidacao(): boolean { return this.dispararExcecoesNaValidacao; }
  setDispararExcecoesNaValidacao(v: boolean): void { this.dispararExcecoesNaValidacao = v; }

  /** getPrioridade (EventoAtualizacao) — 5. */
  getPrioridade(): number { return Pagamento.PRIORIDADE_ATUALIZACAO; }
}
