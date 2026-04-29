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
import DecimalClass from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import type { EventoAtualizacao } from './evento-atualizacao';
import type { HonorarioDoPagamento } from './honorario-do-pagamento';
import type { MultaDoPagamento } from './multa-do-pagamento';
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { NegocioException } from '../../comum/exceptions/negocio-exception';

const ZERO = new DecimalClass(0);

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
  private valorParcelaOutrosDebitos: Decimal | null = null;
  private valorParcelaDebitosCobrarDoReclamante: Decimal | null = null;

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

  getValorParcelaOutrosDebitos(): Decimal | null { return this.valorParcelaOutrosDebitos; }
  setValorParcelaOutrosDebitos(v: Decimal | null): void { this.valorParcelaOutrosDebitos = v; }

  getValorParcelaDebitosCobrarDoReclamante(): Decimal | null {
    return this.valorParcelaDebitosCobrarDoReclamante;
  }
  setValorParcelaDebitosCobrarDoReclamante(v: Decimal | null): void {
    this.valorParcelaDebitosCobrarDoReclamante = v;
  }

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

  /**
   * `verificarRateioInicial` — porte 1-a-1 de Pagamento.java:425-432.
   *
   * Valida consistência: soma das 3 parcelas (crédito reclamante +
   * outros débitos + débitos cobrar do reclamante) deve bater com
   * `valorPagamento`. Se divergir, anexa MSG0125 ao NegocioException
   * retornado.
   *
   * Importante: NÃO lança — retorna o NegocioException acumulador,
   * seguindo contrato Java (caller decide se levanta via `throw`).
   * Parcelas/valorPagamento nulos são tratados como zero.
   */
  verificarRateioInicial(): NegocioException {
    const excecao = new NegocioException();
    const pagtoCredito = this.valorParcelaCreditoReclamante ?? ZERO;
    const pagtoOutros = this.valorParcelaOutrosDebitos ?? ZERO;
    const pagtoDebitos = this.valorParcelaDebitosCobrarDoReclamante ?? ZERO;
    const somaPagamentos = pagtoCredito.plus(pagtoOutros).plus(pagtoDebitos);
    const valor = this.valorPagamento ?? ZERO;
    if (!somaPagamentos.equals(valor)) {
      excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0125));
    }
    return excecao;
  }

  // ─── Campos adicionais Java (linhas 835-1083) ────────────────────────
  private descontoDaContribuicaoSocial: Decimal | null = null;
  private apurarPrevidenciaPrivada: boolean = false;
  private previdenciaPrivada: Decimal | null = null;
  private apurarPensaoAlimenticia: boolean = false;
  private pensaoAlimenticia: Decimal | null = null;
  private apurarImpostoDoReclamante: boolean = false;
  private impostoDoReclamante: Decimal | null = null;
  private inssSobreSalariosDevidosOutrosDebitos: Decimal | null = null;
  private inssSobreSalariosPagosOutrosDebitos: Decimal | null = null;
  private jurosDePrevidenciaPrivadaOutrosDebitos: Decimal | null = null;
  private impostoDeRendaDoReclamanteOutrosDebitos: Decimal | null = null;
  private inssDezPorcento: Decimal | null = null;
  private inssMeioPorcento: Decimal | null = null;
  private custasJudiciaisOutrosDebitos: Decimal | null = null;
  private custasJudiciaisDebitosCobrarDoReclamante: Decimal | null = null;

  // Java getDescontoDaContribuicaoSocial / setDescontoDaContribuicaoSocial (linha 835)
  getDescontoDaContribuicaoSocial(): Decimal | null { return this.descontoDaContribuicaoSocial; }
  setDescontoDaContribuicaoSocial(v: Decimal | null): void { this.descontoDaContribuicaoSocial = v; }
  // Java getApurarPrevidenciaPrivada / set (linha 843)
  getApurarPrevidenciaPrivada(): boolean { return this.apurarPrevidenciaPrivada; }
  setApurarPrevidenciaPrivada(v: boolean): void { this.apurarPrevidenciaPrivada = v; }
  // Java getPrevidenciaPrivada / set (linha 851)
  getPrevidenciaPrivada(): Decimal | null { return this.previdenciaPrivada; }
  setPrevidenciaPrivada(v: Decimal | null): void { this.previdenciaPrivada = v; }
  // Java getApurarPensaoAlimenticia / set (linha 859)
  getApurarPensaoAlimenticia(): boolean { return this.apurarPensaoAlimenticia; }
  setApurarPensaoAlimenticia(v: boolean): void { this.apurarPensaoAlimenticia = v; }
  // Java getPensaoAlimenticia / set (linha 867)
  getPensaoAlimenticia(): Decimal | null { return this.pensaoAlimenticia; }
  setPensaoAlimenticia(v: Decimal | null): void { this.pensaoAlimenticia = v; }
  // Java getApurarImpostoDoReclamante / set (linha 875)
  getApurarImpostoDoReclamante(): boolean { return this.apurarImpostoDoReclamante; }
  setApurarImpostoDoReclamante(v: boolean): void { this.apurarImpostoDoReclamante = v; }
  // Java getImpostoDoReclamante / set (linha 883)
  getImpostoDoReclamante(): Decimal | null { return this.impostoDoReclamante; }
  setImpostoDoReclamante(v: Decimal | null): void { this.impostoDoReclamante = v; }
  // Java getInssSobreSalariosDevidosOutrosDebitos / set (linha 907)
  getInssSobreSalariosDevidosOutrosDebitos(): Decimal | null { return this.inssSobreSalariosDevidosOutrosDebitos; }
  setInssSobreSalariosDevidosOutrosDebitos(v: Decimal | null): void { this.inssSobreSalariosDevidosOutrosDebitos = v; }
  // Java getInssSobreSalariosPagosOutrosDebitos / set (linha 923)
  getInssSobreSalariosPagosOutrosDebitos(): Decimal | null { return this.inssSobreSalariosPagosOutrosDebitos; }
  setInssSobreSalariosPagosOutrosDebitos(v: Decimal | null): void { this.inssSobreSalariosPagosOutrosDebitos = v; }
  // Java getJurosDePrevidenciaPrivadaOutrosDebitos / set (linha 939)
  getJurosDePrevidenciaPrivadaOutrosDebitos(): Decimal | null { return this.jurosDePrevidenciaPrivadaOutrosDebitos; }
  setJurosDePrevidenciaPrivadaOutrosDebitos(v: Decimal | null): void { this.jurosDePrevidenciaPrivadaOutrosDebitos = v; }
  // Java getImpostoDeRendaDoReclamanteOutrosDebitos / set (linha 955)
  getImpostoDeRendaDoReclamanteOutrosDebitos(): Decimal | null { return this.impostoDeRendaDoReclamanteOutrosDebitos; }
  setImpostoDeRendaDoReclamanteOutrosDebitos(v: Decimal | null): void { this.impostoDeRendaDoReclamanteOutrosDebitos = v; }
  // Java getInssDezPorcento / set (linha 971) — INSS 10% adicional Lei 8.036/90
  getInssDezPorcento(): Decimal | null { return this.inssDezPorcento; }
  setInssDezPorcento(v: Decimal | null): void { this.inssDezPorcento = v; }
  // Java getInssMeioPorcento / set (linha 987) — INSS 0,5% adicional LC 110/2001
  getInssMeioPorcento(): Decimal | null { return this.inssMeioPorcento; }
  setInssMeioPorcento(v: Decimal | null): void { this.inssMeioPorcento = v; }
  // Java getCustasJudiciaisOutrosDebitos / set (linha 1083)
  getCustasJudiciaisOutrosDebitos(): Decimal | null { return this.custasJudiciaisOutrosDebitos; }
  setCustasJudiciaisOutrosDebitos(v: Decimal | null): void { this.custasJudiciaisOutrosDebitos = v; }
  // Java getCustasJudiciaisDebitosCobrarDoReclamante / set (linha 1219)
  getCustasJudiciaisDebitosCobrarDoReclamante(): Decimal | null { return this.custasJudiciaisDebitosCobrarDoReclamante; }
  setCustasJudiciaisDebitosCobrarDoReclamante(v: Decimal | null): void { this.custasJudiciaisDebitosCobrarDoReclamante = v; }

  // ─── Metodos calculados Java ────────────────────────────────────────

  /**
   * Java getValorTotalDebitosReclamado — soma INSS Devidos/Pagos + IRPF +
   * PrevPriv + Pensao + Custas Outros Debitos. Usado por relatorio de
   * pagamento para resumo Outros Debitos do Reclamado.
   */
  getValorTotalOutrosDebitosReclamado(): Decimal {
    let total = ZERO;
    total = total.plus(this.inssSobreSalariosDevidosOutrosDebitos ?? ZERO);
    total = total.plus(this.inssSobreSalariosPagosOutrosDebitos ?? ZERO);
    total = total.plus(this.jurosDePrevidenciaPrivadaOutrosDebitos ?? ZERO);
    total = total.plus(this.impostoDeRendaDoReclamanteOutrosDebitos ?? ZERO);
    total = total.plus(this.custasJudiciaisOutrosDebitos ?? ZERO);
    return total;
  }

  /**
   * Java getValorTotalDebitosCobrarDoReclamante — soma das deducoes
   * cobradas do reclamante (CS + IRPF + PrevPriv + Pensao + Custas
   * Cobrar). Java linha ~1195+.
   */
  getValorTotalDebitosCobrarDoReclamante(): Decimal {
    let total = ZERO;
    total = total.plus(this.descontoDaContribuicaoSocial ?? ZERO);
    total = total.plus(this.previdenciaPrivada ?? ZERO);
    total = total.plus(this.pensaoAlimenticia ?? ZERO);
    total = total.plus(this.impostoDoReclamante ?? ZERO);
    total = total.plus(this.custasJudiciaisDebitosCobrarDoReclamante ?? ZERO);
    return total;
  }

  /**
   * Java getValorTotalDoPagamento — soma todas as parcelas e debitos
   * recolhidos pelo reclamado. Total geral movimentado.
   */
  getValorTotalDoPagamento(): Decimal {
    return (this.valorPagamento ?? ZERO)
      .plus(this.getValorTotalOutrosDebitosReclamado())
      .plus(this.inssDezPorcento ?? ZERO)
      .plus(this.inssMeioPorcento ?? ZERO);
  }

  /**
   * Java getValorAmortizadoNoCreditoDoReclamante — quanto do
   * valorParcelaCreditoReclamante foi efetivamente amortizado contra
   * Principal/FGTS/Multas (sobra eh devolvida como saldo).
   */
  getValorAmortizadoNoCreditoDoReclamante(): Decimal {
    return (this.valorParcelaPrincipal ?? ZERO)
      .plus(this.valorParcelaFgts ?? ZERO)
      .plus(this.valorParcelaMultasDevidasReclamante ?? ZERO);
  }

  /**
   * Java isPagamentoCompleto — verifica se valorPagamento cobre
   * pelo menos as deducoes obrigatorias (CS + IRPF + Pensao).
   */
  isPagamentoCompleto(): boolean {
    const minObrigatorio = (this.descontoDaContribuicaoSocial ?? ZERO)
      .plus(this.impostoDoReclamante ?? ZERO)
      .plus(this.pensaoAlimenticia ?? ZERO);
    return (this.valorPagamento ?? ZERO).gte(minObrigatorio);
  }
}
