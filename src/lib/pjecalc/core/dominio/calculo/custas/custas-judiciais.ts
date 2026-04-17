/**
 * PJe-Calc v2.15.1 — CustasJudiciais
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/CustasJudiciais.java (~1078 linhas)
 *
 * Entidade orquestradora das custas judiciais do cálculo. Agrega:
 *   - tipoDeCustasDeConhecimento{DoReclamante,DoReclamado}
 *   - tipoDeCustasDeLiquidacao
 *   - dataVencimentoXxx + valorXxx por categoria
 *   - custas fixas (9 categorias): atos urbanos/rurais, agravos, embargos, recurso
 *     com quantidade + valor unitário
 *   - autosJudiciais (Set<AutoJudicial>)
 *   - custasFixasAtualizacao (Set<CustasFixasAtualizacao>)
 *   - armazenamentos (Set<Armazenamento>)
 *   - custasPagasDoReclamado / custasPagasDoReclamante (Set<CustaPaga>)
 *   - pisos/tetos (reclamante/reclamado/liquidação)
 *   - baseParaCustasCalculadas, valorBaseCustasCalculadas
 *   - índices de correção e taxas de juros por categoria
 *
 * Implementa EventoAtualizacao (Fase 9): prioridade 4.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';
import type { Calculo } from '../calculo';
import {
  BaseParaCustasCalculadasEnum,
  TipoCobrancaReclamanteEnum,
  TipoDeCustasDeConhecimentoEnum,
  TipoDeCustasDeLiquidacaoEnum,
  TipoOrigemRegistroEnum,
} from '../../../constantes/enums';
import type { AutoJudicial } from './auto-judicial';
import type { CustasFixasAtualizacao } from './custas-fixas-atualizacao';
import type { Armazenamento } from './armazenamento';
import type { CustaPaga } from './custa-paga';
import { MaquinaDeCalculoDeCustas } from './maquina-de-calculo-de-custas';

const ZERO = new Decimal(0);
const QUATRO = new Decimal(4);

export class CustasJudiciais implements IModuloLiquidavel {
  static readonly PRIORIDADE_ATUALIZACAO = 4;
  static readonly PISO_RECLAMADO = 1;
  static readonly PISO_RECLAMANTE = 2;
  static readonly TETO_LIQUIDACAO = 3;
  static readonly QUATRO = QUATRO;

  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private baseParaCustasCalculadas: BaseParaCustasCalculadasEnum =
    BaseParaCustasCalculadasEnum.BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO;
  private tipoDeCustasDeConhecimentoDoReclamante: TipoDeCustasDeConhecimentoEnum =
    TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA;
  private dataVencimentoConhecimentoDoReclamante: Date | null = null;
  private valorDeConhecimentoDoReclamante: Decimal | null = null;
  private tipoDeCustasDeConhecimentoDoReclamado: TipoDeCustasDeConhecimentoEnum =
    TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO;
  private dataVencimentoConhecimentoDoReclamado: Date | null = null;
  private valorConhecimentoDoReclamado: Decimal | null = null;
  private tipoDeCustasDeLiquidacao: TipoDeCustasDeLiquidacaoEnum =
    TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA;
  private dataVencimentoCustasDeLiquidacao: Date | null = null;
  private valorCustasDeLiquidacao: Decimal | null = null;
  private dataVencimentoCustasFixas: Date | null = null;

  // Quantidades de custas fixas
  private qtdeAtosUrbanos: number | null = null;
  private qtdeAtosRurais: number | null = null;
  private qtdeAgravosDeInstrumento: number | null = null;
  private qtdeAgravosDePeticao: number | null = null;
  private qtdeImpugnacaoSentenca: number | null = null;
  private qtdeEmbargosArrematacao: number | null = null;
  private qtdeEmbargosExecucao: number | null = null;
  private qtdeEmbargosTerceiros: number | null = null;
  private qtdeRecursoRevista: number | null = null;

  // Valores unitários
  private valorAtosUrbanos: Decimal | null = null;
  private valorAtosRurais: Decimal | null = null;
  private valorAgravoInstrumento: Decimal | null = null;
  private valorAgravoPeticao: Decimal | null = null;
  private valorImpuganacaoSentenca: Decimal | null = null;
  private valorEmbargosArrematacao: Decimal | null = null;
  private valorEmbargosExecucao: Decimal | null = null;
  private valorEmbargosTerceiros: Decimal | null = null;
  private valorRecursoRevista: Decimal | null = null;

  // Coleções
  private autosJudiciais: Set<AutoJudicial> = new Set();
  private custasFixasAtualizacao: Set<CustasFixasAtualizacao> = new Set();
  private armazenamentos: Set<Armazenamento> = new Set();
  private custasPagasDoReclamado: Set<CustaPaga> = new Set();
  private custasPagasDoReclamante: Set<CustaPaga> = new Set();

  // Base e índices
  private valorBaseCustasCalculadas: Decimal | null = null;
  private indiceCorrecaoCustasConhecimentoReclamante: Decimal | null = null;
  private taxaJurosCustasConhecimentoReclamante: Decimal | null = null;
  private indiceCorrecaoCustasConhecimentoReclamado: Decimal | null = null;
  private taxaJurosCustasConhecimentoReclamado: Decimal | null = null;
  private indiceCorrecaoCustasLiquidacao: Decimal | null = null;
  private taxaJurosCustasLiquidacao: Decimal | null = null;
  private indiceCorrecaoCustasFixas: Decimal | null = null;
  private taxaJurosCustasFixas: Decimal | null = null;

  // Pisos/Tetos
  private pisoCustasConhecimentoReclamante: Decimal | null = null;
  private pisoCustasConhecimentoReclamado: Decimal | null = null;
  private tetoCustasConhecimentoReclamante: Decimal | null = null;
  private tetoCustasConhecimentoReclamado: Decimal | null = null;
  private tetoCustasLiquidacao: Decimal | null = null;

  private folhaDoEvento: string | null = null;
  private tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
  private aplicarTetoCustasConhecimentoCalcExterno: boolean = false;

  // ── Campos legacy V3 (pjc-to-engine) ──
  private percentualLegacy: Decimal = new Decimal(2);
  private valorMinimoLegacy: Decimal = new Decimal('10.64');
  private valorMaximoLegacy: Decimal | null = null;
  private isentoLegacy: boolean = false;
  private valorCalculadoLegacy: Decimal = ZERO;
  private valorFixoLegacy: Decimal | null = null;

  constructor(calculo?: Calculo) {
    if (calculo) this.calculo = calculo;
  }

  // ── EntidadeBase ──
  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getBaseParaCustasCalculadas(): BaseParaCustasCalculadasEnum { return this.baseParaCustasCalculadas; }
  setBaseParaCustasCalculadas(v: BaseParaCustasCalculadasEnum): void { this.baseParaCustasCalculadas = v; }

  getTipoDeCustasDeConhecimentoDoReclamante(): TipoDeCustasDeConhecimentoEnum { return this.tipoDeCustasDeConhecimentoDoReclamante; }
  setTipoDeCustasDeConhecimentoDoReclamante(v: TipoDeCustasDeConhecimentoEnum): void { this.tipoDeCustasDeConhecimentoDoReclamante = v; }

  getDataVencimentoConhecimentoDoReclamante(): Date | null { return this.dataVencimentoConhecimentoDoReclamante; }
  setDataVencimentoConhecimentoDoReclamante(d: Date | null): void { this.dataVencimentoConhecimentoDoReclamante = d; }

  getValorDeConhecimentoDoReclamante(): Decimal | null { return this.valorDeConhecimentoDoReclamante; }
  setValorDeConhecimentoDoReclamante(v: Decimal | null): void { this.valorDeConhecimentoDoReclamante = v; }

  getTipoDeCustasDeConhecimentoDoReclamado(): TipoDeCustasDeConhecimentoEnum { return this.tipoDeCustasDeConhecimentoDoReclamado; }
  setTipoDeCustasDeConhecimentoDoReclamado(v: TipoDeCustasDeConhecimentoEnum): void { this.tipoDeCustasDeConhecimentoDoReclamado = v; }

  getDataVencimentoConhecimentoDoReclamado(): Date | null { return this.dataVencimentoConhecimentoDoReclamado; }
  setDataVencimentoConhecimentoDoReclamado(d: Date | null): void { this.dataVencimentoConhecimentoDoReclamado = d; }

  getValorConhecimentoDoReclamado(): Decimal | null { return this.valorConhecimentoDoReclamado; }
  setValorConhecimentoDoReclamado(v: Decimal | null): void { this.valorConhecimentoDoReclamado = v; }

  getTipoDeCustasDeLiquidacao(): TipoDeCustasDeLiquidacaoEnum { return this.tipoDeCustasDeLiquidacao; }
  setTipoDeCustasDeLiquidacao(v: TipoDeCustasDeLiquidacaoEnum): void { this.tipoDeCustasDeLiquidacao = v; }

  getDataVencimentoCustasDeLiquidacao(): Date | null { return this.dataVencimentoCustasDeLiquidacao; }
  setDataVencimentoCustasDeLiquidacao(d: Date | null): void { this.dataVencimentoCustasDeLiquidacao = d; }

  getValorCustasDeLiquidacao(): Decimal | null { return this.valorCustasDeLiquidacao; }
  setValorCustasDeLiquidacao(v: Decimal | null): void { this.valorCustasDeLiquidacao = v; }

  getDataVencimentoCustasFixas(): Date | null { return this.dataVencimentoCustasFixas; }
  setDataVencimentoCustasFixas(d: Date | null): void { this.dataVencimentoCustasFixas = d; }

  getQtdeAtosUrbanos(): number | null { return this.qtdeAtosUrbanos; }
  setQtdeAtosUrbanos(v: number | null): void { this.qtdeAtosUrbanos = v; }

  getQtdeAtosRurais(): number | null { return this.qtdeAtosRurais; }
  setQtdeAtosRurais(v: number | null): void { this.qtdeAtosRurais = v; }

  getQtdeAgravosDeInstrumento(): number | null { return this.qtdeAgravosDeInstrumento; }
  setQtdeAgravosDeInstrumento(v: number | null): void { this.qtdeAgravosDeInstrumento = v; }

  getQtdeAgravosDePeticao(): number | null { return this.qtdeAgravosDePeticao; }
  setQtdeAgravosDePeticao(v: number | null): void { this.qtdeAgravosDePeticao = v; }

  getQtdeImpugnacaoSentenca(): number | null { return this.qtdeImpugnacaoSentenca; }
  setQtdeImpugnacaoSentenca(v: number | null): void { this.qtdeImpugnacaoSentenca = v; }

  getQtdeEmbargosArrematacao(): number | null { return this.qtdeEmbargosArrematacao; }
  setQtdeEmbargosArrematacao(v: number | null): void { this.qtdeEmbargosArrematacao = v; }

  getQtdeEmbargosExecucao(): number | null { return this.qtdeEmbargosExecucao; }
  setQtdeEmbargosExecucao(v: number | null): void { this.qtdeEmbargosExecucao = v; }

  getQtdeEmbargosTerceiros(): number | null { return this.qtdeEmbargosTerceiros; }
  setQtdeEmbargosTerceiros(v: number | null): void { this.qtdeEmbargosTerceiros = v; }

  getQtdeRecursoRevista(): number | null { return this.qtdeRecursoRevista; }
  setQtdeRecursoRevista(v: number | null): void { this.qtdeRecursoRevista = v; }

  getValorAtosUrbanos(): Decimal | null { return this.valorAtosUrbanos; }
  setValorAtosUrbanos(v: Decimal | null): void { this.valorAtosUrbanos = v; }

  getValorAtosRurais(): Decimal | null { return this.valorAtosRurais; }
  setValorAtosRurais(v: Decimal | null): void { this.valorAtosRurais = v; }

  getValorAgravoInstrumento(): Decimal | null { return this.valorAgravoInstrumento; }
  setValorAgravoInstrumento(v: Decimal | null): void { this.valorAgravoInstrumento = v; }

  getValorAgravoPeticao(): Decimal | null { return this.valorAgravoPeticao; }
  setValorAgravoPeticao(v: Decimal | null): void { this.valorAgravoPeticao = v; }

  getValorImpuganacaoSentenca(): Decimal | null { return this.valorImpuganacaoSentenca; }
  setValorImpuganacaoSentenca(v: Decimal | null): void { this.valorImpuganacaoSentenca = v; }

  getValorEmbargosArrematacao(): Decimal | null { return this.valorEmbargosArrematacao; }
  setValorEmbargosArrematacao(v: Decimal | null): void { this.valorEmbargosArrematacao = v; }

  getValorEmbargosExecucao(): Decimal | null { return this.valorEmbargosExecucao; }
  setValorEmbargosExecucao(v: Decimal | null): void { this.valorEmbargosExecucao = v; }

  getValorEmbargosTerceiros(): Decimal | null { return this.valorEmbargosTerceiros; }
  setValorEmbargosTerceiros(v: Decimal | null): void { this.valorEmbargosTerceiros = v; }

  getValorRecursoRevista(): Decimal | null { return this.valorRecursoRevista; }
  setValorRecursoRevista(v: Decimal | null): void { this.valorRecursoRevista = v; }

  getAutosJudiciais(): Set<AutoJudicial> { return this.autosJudiciais; }
  setAutosJudiciais(v: Set<AutoJudicial>): void { this.autosJudiciais = v; }

  getCustasFixasAtualizacao(): Set<CustasFixasAtualizacao> { return this.custasFixasAtualizacao; }
  setCustasFixasAtualizacao(v: Set<CustasFixasAtualizacao>): void { this.custasFixasAtualizacao = v; }

  getArmazenamentos(): Set<Armazenamento> { return this.armazenamentos; }
  setArmazenamentos(v: Set<Armazenamento>): void { this.armazenamentos = v; }

  getCustasPagasDoReclamado(): Set<CustaPaga> { return this.custasPagasDoReclamado; }
  setCustasPagasDoReclamado(v: Set<CustaPaga>): void { this.custasPagasDoReclamado = v; }

  getCustasPagasDoReclamante(): Set<CustaPaga> { return this.custasPagasDoReclamante; }
  setCustasPagasDoReclamante(v: Set<CustaPaga>): void { this.custasPagasDoReclamante = v; }

  getValorBaseCustasCalculadas(): Decimal | null { return this.valorBaseCustasCalculadas; }
  setValorBaseCustasCalculadas(v: Decimal | null): void { this.valorBaseCustasCalculadas = v; }

  getIndiceCorrecaoCustasConhecimentoReclamante(): Decimal | null { return this.indiceCorrecaoCustasConhecimentoReclamante; }
  setIndiceCorrecaoCustasConhecimentoReclamante(v: Decimal | null): void { this.indiceCorrecaoCustasConhecimentoReclamante = v; }

  getTaxaJurosCustasConhecimentoReclamante(): Decimal | null { return this.taxaJurosCustasConhecimentoReclamante; }
  setTaxaJurosCustasConhecimentoReclamante(v: Decimal | null): void { this.taxaJurosCustasConhecimentoReclamante = v; }

  getIndiceCorrecaoCustasConhecimentoReclamado(): Decimal | null { return this.indiceCorrecaoCustasConhecimentoReclamado; }
  setIndiceCorrecaoCustasConhecimentoReclamado(v: Decimal | null): void { this.indiceCorrecaoCustasConhecimentoReclamado = v; }

  getTaxaJurosCustasConhecimentoReclamado(): Decimal | null { return this.taxaJurosCustasConhecimentoReclamado; }
  setTaxaJurosCustasConhecimentoReclamado(v: Decimal | null): void { this.taxaJurosCustasConhecimentoReclamado = v; }

  getIndiceCorrecaoCustasLiquidacao(): Decimal | null { return this.indiceCorrecaoCustasLiquidacao; }
  setIndiceCorrecaoCustasLiquidacao(v: Decimal | null): void { this.indiceCorrecaoCustasLiquidacao = v; }

  getTaxaJurosCustasLiquidacao(): Decimal | null { return this.taxaJurosCustasLiquidacao; }
  setTaxaJurosCustasLiquidacao(v: Decimal | null): void { this.taxaJurosCustasLiquidacao = v; }

  getIndiceCorrecaoCustasFixas(): Decimal | null { return this.indiceCorrecaoCustasFixas; }
  setIndiceCorrecaoCustasFixas(v: Decimal | null): void { this.indiceCorrecaoCustasFixas = v; }

  getTaxaJurosCustasFixas(): Decimal | null { return this.taxaJurosCustasFixas; }
  setTaxaJurosCustasFixas(v: Decimal | null): void { this.taxaJurosCustasFixas = v; }

  getPisoCustasConhecimentoReclamante(): Decimal | null { return this.pisoCustasConhecimentoReclamante; }
  setPisoCustasConhecimentoReclamante(v: Decimal | null): void { this.pisoCustasConhecimentoReclamante = v; }

  getPisoCustasConhecimentoReclamado(): Decimal | null { return this.pisoCustasConhecimentoReclamado; }
  setPisoCustasConhecimentoReclamado(v: Decimal | null): void { this.pisoCustasConhecimentoReclamado = v; }

  getTetoCustasConhecimentoReclamante(): Decimal | null { return this.tetoCustasConhecimentoReclamante; }
  setTetoCustasConhecimentoReclamante(v: Decimal | null): void { this.tetoCustasConhecimentoReclamante = v; }

  getTetoCustasConhecimentoReclamado(): Decimal | null { return this.tetoCustasConhecimentoReclamado; }
  setTetoCustasConhecimentoReclamado(v: Decimal | null): void { this.tetoCustasConhecimentoReclamado = v; }

  getTetoCustasLiquidacao(): Decimal | null { return this.tetoCustasLiquidacao; }
  setTetoCustasLiquidacao(v: Decimal | null): void { this.tetoCustasLiquidacao = v; }

  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  getTipoCobrancaReclamante(): TipoCobrancaReclamanteEnum { return this.tipoCobrancaReclamante; }
  setTipoCobrancaReclamante(v: TipoCobrancaReclamanteEnum): void { this.tipoCobrancaReclamante = v; }

  getAplicarTetoCustasConhecimentoCalcExterno(): boolean { return this.aplicarTetoCustasConhecimentoCalcExterno; }
  setAplicarTetoCustasConhecimentoCalcExterno(v: boolean): void { this.aplicarTetoCustasConhecimentoCalcExterno = v; }

  /** getAutosJudiciaisDoCalculo (Java linha 472) — filtra por origem CALCULO. */
  getAutosJudiciaisDoCalculo(): Set<AutoJudicial> {
    const result = new Set<AutoJudicial>();
    for (const auto of this.autosJudiciais) {
      if (auto.getOrigemRegistro() === TipoOrigemRegistroEnum.CALCULO) result.add(auto);
    }
    return result;
  }

  /** getAutosJudiciaisDaAtualizacao (Java linha 484) — filtra por origem ATUALIZACAO. */
  getAutosJudiciaisDaAtualizacao(): Set<AutoJudicial> {
    const result = new Set<AutoJudicial>();
    for (const auto of this.autosJudiciais) {
      if (auto.getOrigemRegistro() === TipoOrigemRegistroEnum.ATUALIZACAO) result.add(auto);
    }
    return result;
  }

  /** getPrioridade (EventoAtualizacao). */
  getPrioridade(): number { return CustasJudiciais.PRIORIDADE_ATUALIZACAO; }

  /**
   * calcularValorTetoCustasConhecimento (Java linha 262) — teto previdenciário × 4.
   * Stub: depende de TabelaPrevidenciariaSeguradoEmpregado (Fase 6/infra).
   */
  static calcularValorTetoCustasConhecimento(_dataLiquidacao: Date): Decimal | null {
    return null;
  }

  liquidar(): void {
    // Fluxo legacy (pjc-to-engine)
    if (!this.valorCalculadoLegacy.isZero()) return;
    const base = this.valorBaseCustasCalculadas ?? ZERO;
    this.calcular(base);
    new MaquinaDeCalculoDeCustas(this).liquidar();
  }

  // ─────────────────────────────────────────────────────────────────────
  //                     API LEGACY (V3 pjc-to-engine)
  // ─────────────────────────────────────────────────────────────────────

  getPercentual(): Decimal { return this.percentualLegacy; }
  setPercentual(v: Decimal): void { this.percentualLegacy = v; }
  getValorMinimo(): Decimal { return this.valorMinimoLegacy; }
  setValorMinimo(v: Decimal): void { this.valorMinimoLegacy = v; }
  getValorMaximo(): Decimal | null { return this.valorMaximoLegacy; }
  setValorMaximo(v: Decimal | null): void { this.valorMaximoLegacy = v; }
  getIsento(): boolean { return this.isentoLegacy; }
  setIsento(v: boolean): void { this.isentoLegacy = v; }
  getValorCalculado(): Decimal { return this.valorCalculadoLegacy; }
  getValorFixo(): Decimal | null { return this.valorFixoLegacy; }
  setValorFixo(v: Decimal | null): void { this.valorFixoLegacy = v; }

  /** calcular (legacy) — percentual com piso e máximo, respeitando isento/valorFixo. */
  calcular(base: Decimal): void {
    if (this.isentoLegacy) {
      this.valorCalculadoLegacy = ZERO;
      return;
    }
    if (this.valorFixoLegacy !== null) {
      this.valorCalculadoLegacy = this.valorFixoLegacy;
      return;
    }
    let valor = arredondarValorMonetario(base.times(this.percentualLegacy).div(100));
    if (valor.comparedTo(this.valorMinimoLegacy) < 0) valor = this.valorMinimoLegacy;
    if (this.valorMaximoLegacy !== null && valor.comparedTo(this.valorMaximoLegacy) > 0) {
      valor = this.valorMaximoLegacy;
    }
    this.valorCalculadoLegacy = valor;
  }
}
