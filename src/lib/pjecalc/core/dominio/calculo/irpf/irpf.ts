/**
 * PJe-Calc v2.15.1 — Irpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/Irpf.java (~541 linhas)
 *
 * Entidade orquestradora do IRPF do cálculo. Campos:
 *   - calculo (OneToOne)
 *   - apurarImpostoRenda (flag)
 *   - incidirSobreJurosDeMora / cobrarDoReclamado
 *   - considerarTributacaoExclusiva (13º)
 *   - considerarTributacaoEmSeparado (férias)
 *   - regimeDeCaixa
 *   - deduzirContribuicaoSocialDevidaPeloReclamante
 *   - deduzirPrevidenciaPrivada / deduzirPensaoAlimenticia / deduzirHonorariosDevidosPeloReclamante
 *   - aposentadoMaiorQue65Anos
 *   - possuiDependentes / quantidadeDependentes
 *   - dataInicioAnosAnteriores / dataFimAnosAnteriores / dataInicio/FimAnoRecebimento
 *   - ocorrencias (Set<OcorrenciaDeIrpf>) + ocorrenciasAtualizacao + ocorrenciasPagamento
 *   - maquinaDeCalculoDeIrpf (transient)
 *   - legendaDaFormula (transient)
 *   - qtdMesesRendimentoTributaveis
 *
 * Também mantém API legacy V3 (liquidarComDados + faixas) para o pjc-to-engine.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import { Periodo } from '../../../base/comum/periodo';
import type { IModuloLiquidavel } from '../calculo';
import type { Calculo } from '../calculo';
import { OcorrenciaDeIrpf } from './ocorrencia-de-irpf';
import { OcorrenciaDeIrpfAtualizacao } from './ocorrencia-de-irpf-atualizacao';
import { OcorrenciaDeIrpfPagamento } from './ocorrencia-de-irpf-pagamento';
import {
  MaquinaDeCalculoDeIrpf,
  type CreditosDoReclamante,
  type DebitosDoReclamante,
  type Pagamento,
} from './maquina-de-calculo-de-irpf';
import { LegendaDaFormulaDoIrpf } from './legenda-da-formula-do-irpf';
import type { ProporcoesIrpf } from './proporcoes-irpf';

/** Faixa legacy usada pelo V3 (pjc-to-engine). */
export interface FaixaDeIrpf {
  ate: Decimal;
  aliquota: Decimal;
  deducao: Decimal;
}

const ZERO = new Decimal(0);

export class Irpf implements IModuloLiquidavel {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;

  private apurarImpostoRenda: boolean = true;
  private incidirSobreJurosDeMora: boolean = false;
  private cobrarDoReclamado: boolean = false;
  private considerarTributacaoExclusiva: boolean = false;
  private considerarTributacaoEmSeparado: boolean = false;
  private regimeDeCaixa: boolean = false;
  private deduzirContribuicaoSocialDevidaPeloReclamante: boolean = true;
  private deduzirPrevidenciaPrivada: boolean = true;
  private deduzirPensaoAlimenticia: boolean = true;
  private deduzirHonorariosDevidosPeloReclamante: boolean = true;
  private aposentadoMaiorQue65Anos: boolean = false;
  private possuiDependentes: boolean = false;
  private quantidadeDependentes: number = 0;

  private dataInicioAnosAnteriores: Date | null = null;
  private dataFimAnosAnteriores: Date | null = null;
  private dataInicioAnoRecebimento: Date | null = null;
  private dataFimAnoRecebimento: Date | null = null;

  private ocorrencias: Set<OcorrenciaDeIrpf> = new Set();
  private ocorrenciasAtualizacao: Set<OcorrenciaDeIrpfAtualizacao> = new Set();
  private ocorrenciasPagamento: Set<OcorrenciaDeIrpfPagamento> = new Set();

  private qtdMesesRendimentoTributaveis: number | null = null;

  // transient
  private maquinaDeCalculoDeIrpf: MaquinaDeCalculoDeIrpf;
  private periodoDasOcorrencias: Periodo | null = null;
  private cobrarEncargos: boolean | null = null;
  private legendaDaFormula: LegendaDaFormulaDoIrpf | null = null;

  // ── campos legacy (V3) ──
  private baseDeCalculo: Decimal = ZERO;
  private deducoes: Decimal = ZERO;
  private baseTributavel: Decimal = ZERO;
  private impostoDevido: Decimal = ZERO;
  private mesesRRA: number = 1;
  private faixas: FaixaDeIrpf[] = [];
  private deduzirCS: boolean = true;
  private dependentes: number = 0;
  private deducaoDependente: Decimal = new Decimal('189.59');

  constructor(calculo?: Calculo) {
    this.maquinaDeCalculoDeIrpf = new MaquinaDeCalculoDeIrpf(this);
    if (calculo) this.calculo = calculo;
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getApurarImpostoRenda(): boolean { return this.apurarImpostoRenda; }
  setApurarImpostoRenda(v: boolean): void { this.apurarImpostoRenda = v; }

  getIncidirSobreJurosDeMora(): boolean { return this.incidirSobreJurosDeMora; }
  setIncidirSobreJurosDeMora(v: boolean): void { this.incidirSobreJurosDeMora = v; }

  getCobrarDoReclamado(): boolean { return this.cobrarDoReclamado; }
  setCobrarDoReclamado(v: boolean): void { this.cobrarDoReclamado = v; }

  getConsiderarTributacaoExclusiva(): boolean { return this.considerarTributacaoExclusiva; }
  setConsiderarTributacaoExclusiva(v: boolean): void { this.considerarTributacaoExclusiva = v; }

  getConsiderarTributacaoEmSeparado(): boolean { return this.considerarTributacaoEmSeparado; }
  setConsiderarTributacaoEmSeparado(v: boolean): void { this.considerarTributacaoEmSeparado = v; }

  getRegimeDeCaixa(): boolean { return this.regimeDeCaixa; }
  setRegimeDeCaixa(v: boolean): void { this.regimeDeCaixa = v; }

  getDeduzirContribuicaoSocialDevidaPeloReclamante(): boolean { return this.deduzirContribuicaoSocialDevidaPeloReclamante; }
  setDeduzirContribuicaoSocialDevidaPeloReclamante(v: boolean): void { this.deduzirContribuicaoSocialDevidaPeloReclamante = v; }

  getDeduzirPrevidenciaPrivada(): boolean { return this.deduzirPrevidenciaPrivada; }
  setDeduzirPrevidenciaPrivada(v: boolean): void { this.deduzirPrevidenciaPrivada = v; }

  getDeduzirPensaoAlimenticia(): boolean { return this.deduzirPensaoAlimenticia; }
  setDeduzirPensaoAlimenticia(v: boolean): void { this.deduzirPensaoAlimenticia = v; }

  getDeduzirHonorariosDevidosPeloReclamante(): boolean { return this.deduzirHonorariosDevidosPeloReclamante; }
  setDeduzirHonorariosDevidosPeloReclamante(v: boolean): void { this.deduzirHonorariosDevidosPeloReclamante = v; }

  getAposentadoMaiorQue65Anos(): boolean { return this.aposentadoMaiorQue65Anos; }
  setAposentadoMaiorQue65Anos(v: boolean): void { this.aposentadoMaiorQue65Anos = v; }

  getPossuiDependentes(): boolean { return this.possuiDependentes; }
  setPossuiDependentes(v: boolean): void { this.possuiDependentes = v; }

  getQuantidadeDependentes(): number { return this.quantidadeDependentes; }
  setQuantidadeDependentes(v: number): void { this.quantidadeDependentes = v; }

  getDataInicioAnosAnteriores(): Date | null { return this.dataInicioAnosAnteriores; }
  setDataInicioAnosAnteriores(d: Date | null): void { this.dataInicioAnosAnteriores = d; }

  getDataFimAnosAnteriores(): Date | null { return this.dataFimAnosAnteriores; }
  setDataFimAnosAnteriores(d: Date | null): void { this.dataFimAnosAnteriores = d; }

  getDataInicioAnoRecebimento(): Date | null { return this.dataInicioAnoRecebimento; }
  setDataInicioAnoRecebimento(d: Date | null): void { this.dataInicioAnoRecebimento = d; }

  getDataFimAnoRecebimento(): Date | null { return this.dataFimAnoRecebimento; }
  setDataFimAnoRecebimento(d: Date | null): void { this.dataFimAnoRecebimento = d; }

  getQtdMesesRendimentoTributaveis(): number | null { return this.qtdMesesRendimentoTributaveis; }
  setQtdMesesRendimentoTributaveis(v: number | null): void { this.qtdMesesRendimentoTributaveis = v; }

  getCobrarEncargos(): boolean | null { return this.cobrarEncargos; }
  setCobrarEncargos(v: boolean | null): void { this.cobrarEncargos = v; }

  getOcorrencias(): Set<OcorrenciaDeIrpf> { return this.ocorrencias; }
  setOcorrencias(v: Set<OcorrenciaDeIrpf>): void { this.ocorrencias = v; }

  getOcorrenciasAtualizacao(): Set<OcorrenciaDeIrpfAtualizacao> { return this.ocorrenciasAtualizacao; }
  setOcorrenciasAtualizacao(v: Set<OcorrenciaDeIrpfAtualizacao>): void { this.ocorrenciasAtualizacao = v; }

  getOcorrenciasPagamento(): Set<OcorrenciaDeIrpfPagamento> { return this.ocorrenciasPagamento; }
  setOcorrenciasPagamento(v: Set<OcorrenciaDeIrpfPagamento>): void { this.ocorrenciasPagamento = v; }

  /** getLegendaDaFormula (Java linha 348) — lazy init. */
  getLegendaDaFormula(): LegendaDaFormulaDoIrpf {
    if (this.legendaDaFormula === null) {
      this.legendaDaFormula = new LegendaDaFormulaDoIrpf(this);
    }
    return this.legendaDaFormula;
  }

  /** getPeriodoDasOcorrencias (Java linha 377) — lazy; primeiro/último dataOcorrencia. */
  getPeriodoDasOcorrencias(): Periodo {
    if (this.periodoDasOcorrencias === null) {
      this.periodoDasOcorrencias = new Periodo();
      const arr = Array.from(this.ocorrencias);
      if (arr.length > 0) {
        const primeira = arr[0].getDataOcorrencia();
        const ultima = arr[arr.length - 1].getDataOcorrencia();
        if (primeira) this.periodoDasOcorrencias.setInicial(primeira);
        if (ultima) this.periodoDasOcorrencias.setFinal(ultima);
      }
    }
    return this.periodoDasOcorrencias;
  }

  /**
   * getAbrangenciaDaApuracao (Java linha 389)
   *   2 — ambos (anos anteriores + ano de recebimento)
   *   1 — apenas anos anteriores
   *   0 — apenas ano de recebimento
   *  -1 — nenhum
   */
  getAbrangenciaDaApuracao(): number {
    if (this.dataInicioAnosAnteriores !== null && this.dataFimAnoRecebimento !== null) return 2;
    if (this.dataInicioAnosAnteriores !== null) return 1;
    if (this.dataFimAnoRecebimento !== null) return 0;
    return -1;
  }

  /** consistirDados (Java linha 413) — limpa flags quando não apura. */
  consistirDados(): void {
    if (!this.apurarImpostoRenda) {
      this.incidirSobreJurosDeMora = false;
      this.cobrarDoReclamado = false;
      this.considerarTributacaoExclusiva = false;
      this.considerarTributacaoEmSeparado = false;
      this.regimeDeCaixa = false;
      this.deduzirContribuicaoSocialDevidaPeloReclamante = false;
      this.deduzirPrevidenciaPrivada = false;
      this.deduzirPensaoAlimenticia = false;
      this.deduzirHonorariosDevidosPeloReclamante = false;
      this.aposentadoMaiorQue65Anos = false;
      this.possuiDependentes = false;
      this.quantidadeDependentes = 0;
    }
  }

  /** configurarValoresPadroes (Java linha 492) — restaura defaults. */
  configurarValoresPadroes(): void {
    if (this.apurarImpostoRenda) {
      this.incidirSobreJurosDeMora = false;
      this.cobrarDoReclamado = false;
      this.considerarTributacaoExclusiva = false;
      this.considerarTributacaoEmSeparado = false;
      this.regimeDeCaixa = false;
      this.deduzirContribuicaoSocialDevidaPeloReclamante = true;
      this.deduzirPrevidenciaPrivada = true;
      this.deduzirPensaoAlimenticia = true;
      this.deduzirHonorariosDevidosPeloReclamante = true;
      this.aposentadoMaiorQue65Anos = false;
      this.possuiDependentes = false;
      this.quantidadeDependentes = 0;
    }
  }

  /** liquidarAtualizacao (Java linha 434) — delega para maquina se houver pagamento. */
  liquidarAtualizacao(
    dataEvento: Date,
    proporcoesIrpf: ProporcoesIrpf,
    creditoDoReclamante: CreditosDoReclamante,
    debitosDoReclamante: DebitosDoReclamante,
    hasPagamentoPrincipal: boolean,
  ): void {
    const pagoPrincipal = creditoDoReclamante.getPagoPrincipal?.() ?? null;
    const difPrincipal = creditoDoReclamante.getDiferencaPrincipal?.() ?? null;
    const condPagamento = hasPagamentoPrincipal && pagoPrincipal !== null && pagoPrincipal.gt(0);
    const condDiferenca = !hasPagamentoPrincipal && difPrincipal !== null && difPrincipal.gt(0);
    if (!condPagamento && !condDiferenca) return;

    this.periodoDasOcorrencias = null;
    const calc = this.calculo as unknown as { isCalculoExterno?(): boolean } | null;
    if (calc?.isCalculoExterno?.()) {
      this.maquinaDeCalculoDeIrpf.liquidarAtualizacaoCalculoExterno(dataEvento, creditoDoReclamante, debitosDoReclamante, hasPagamentoPrincipal);
    } else {
      this.maquinaDeCalculoDeIrpf.liquidarAtualizacao(dataEvento, proporcoesIrpf, creditoDoReclamante, debitosDoReclamante, hasPagamentoPrincipal);
    }
  }

  aplicarPagamento(dataEvento: Date, pagamento: Pagamento): void {
    this.maquinaDeCalculoDeIrpf.aplicarPagamento(dataEvento, pagamento);
  }

  aplicarPagamentoNoSaldo(dataDeLiquidacao: Date): void {
    this.maquinaDeCalculoDeIrpf.aplicarPagamentoNoSaldo(dataDeLiquidacao);
  }

  getTotalDiferencaComJurosEMultaAtualizacao(): Decimal {
    return this.maquinaDeCalculoDeIrpf.getTotalDiferencaComJurosEMultaAtualizacao();
  }

  getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(dataEvento: Date): Decimal {
    return this.maquinaDeCalculoDeIrpf.getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(dataEvento);
  }

  getTotalDevidoComJurosEMultaAtualizacao(dataEvento: Date): Decimal {
    return this.maquinaDeCalculoDeIrpf.getTotalDevidoComJurosEMultaAtualizacao(dataEvento);
  }

  getTotalDevidoDeImpostoReferenteAoPagamento(pagamento: Pagamento): Decimal {
    return this.maquinaDeCalculoDeIrpf.getTotalDevidoDeImpostoReferenteAoPagamento(pagamento);
  }

  /** getTotalValorDevido (Java linha 474) — soma dos valores devidos em todas as ocorrências. */
  getTotalValorDevido(): Decimal {
    let total: Decimal | null = null;
    for (const oc of this.ocorrencias) {
      const v = oc.getValorDevido();
      total = total === null ? v : total.plus(v);
    }
    return total ?? ZERO;
  }

  /** liquidar (Java linha 469) — reset + delega para maquina. */
  liquidar(): void {
    this.periodoDasOcorrencias = null;
    this.maquinaDeCalculoDeIrpf.liquidar();
  }

  // ─────────────────────────────────────────────────────────────────────
  //                   API LEGACY (V3 pjc-to-engine)
  // ─────────────────────────────────────────────────────────────────────

  getBaseDeCalculo(): Decimal { return this.baseDeCalculo; }
  getDeducoes(): Decimal { return this.deducoes; }
  getBaseTributavel(): Decimal { return this.baseTributavel; }
  getImpostoDevido(): Decimal { return this.impostoDevido; }
  getMesesRRA(): number { return this.mesesRRA; }
  setMesesRRA(v: number): void { this.mesesRRA = v; }
  setFaixas(v: FaixaDeIrpf[]): void { this.faixas = v; }
  setDeduzirCS(v: boolean): void { this.deduzirCS = v; }
  setDependentes(v: number): void { this.dependentes = v; }
  setDeducaoDependente(v: Decimal): void { this.deducaoDependente = v; }

  /**
   * liquidarComDados (V3 legacy) — fluxo do Art. 12-A RRA simplificado.
   * Mantido intacto para compatibilidade com o pjc-to-engine atual.
   */
  liquidarComDados(baseBruta: Decimal, deducaoCS: Decimal, meses: number): void {
    this.mesesRRA = Math.max(1, meses);
    this.baseDeCalculo = baseBruta;
    let totalDeducoes: Decimal = ZERO;
    if (this.deduzirCS) totalDeducoes = totalDeducoes.plus(deducaoCS);
    totalDeducoes = totalDeducoes.plus(this.deducaoDependente.times(this.dependentes).times(this.mesesRRA));
    this.deducoes = arredondarValorMonetario(totalDeducoes);
    const baseMensal = baseBruta.minus(totalDeducoes).div(this.mesesRRA);
    this.baseTributavel = arredondarValorMonetario(baseMensal.isNegative() ? ZERO : baseMensal);

    if (this.baseTributavel.isZero() || this.faixas.length === 0) {
      this.impostoDevido = ZERO;
      return;
    }
    let impostoMensal: Decimal = ZERO;
    for (const faixa of this.faixas) {
      if (this.baseTributavel.comparedTo(faixa.ate) <= 0 || faixa.aliquota.isZero()) {
        impostoMensal = this.baseTributavel.times(faixa.aliquota).minus(faixa.deducao);
        break;
      }
    }
    if (impostoMensal.isZero()) {
      const ultima = this.faixas[this.faixas.length - 1];
      impostoMensal = this.baseTributavel.times(ultima.aliquota).minus(ultima.deducao);
    }
    const impostoTotal = impostoMensal.isNegative() ? ZERO : impostoMensal.times(this.mesesRRA);
    this.impostoDevido = arredondarValorMonetario(impostoTotal);
  }
}
