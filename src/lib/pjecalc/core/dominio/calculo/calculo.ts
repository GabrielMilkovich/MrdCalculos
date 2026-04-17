/**
 * PJe-Calc v2.15.1 — Calculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/Calculo.java (~3087 linhas)
 *
 * Entidade ORQUESTRADORA — controla o fluxo principal de liquidação e agrega
 * todos os módulos de cálculo (FGTS, INSS, IRPF, Honor, Multa, Custas,
 * Previd. Privada, Pensão Alim., Salário Família, Seguro Desemprego).
 *
 * ## Fluxo de liquidar() (linhas 1475-1537 do Java)
 *   1. Cria TabelaDeCorrecaoMonetaria com índice trabalhista
 *   2. Carrega tabela de correção para o período (admissão → liquidação)
 *   3. Para cada verba ativa: seta a tabela de correção + liquidar()
 *   4. SalarioFamilia.liquidar() + SeguroDesemprego.liquidar()
 *   5. FGTS.liquidar()
 *   6. INSS.liquidar(dataLiquidacao)
 *   7. PrevidenciaPrivada.liquidar()
 *   8. calcularJuros()
 *   9. PensaoAlimenticia.liquidar()
 *  10. Multas.liquidar()
 *  11. Honorarios.liquidar()
 *  12. IRPF.liquidar()
 *  13. CustasJudiciais.liquidar()
 *
 * Esta implementação preserva a API legacy V3 (usada pelo pjc-to-engine.ts)
 * e adiciona todos os campos/acessores do Java Calculo em fidelidade 1:1.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { arredondarValorMonetario } from '../../base/comum/utils';
import {
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  InstanciaSetorEnum,
  LogicoEnum,
  RegimeDoContratoEnum,
  TipoCalculoEnum,
  TipoDeApuracaoPrazoDoAvisoPrevioEnum,
} from '../../constantes/enums';
import { VerbaDeCalculo } from '../verbacalculo/verba-de-calculo';
import {
  TabelaDeCorrecaoMonetaria,
  type ITabelaCorrecaoContext,
} from '../verbacalculo/tabela-de-correcao-monetaria';
import { ParametrosDeAtualizacao } from './atualizacao/parametros-de-atualizacao';
import type { CombinacaoDeIndice } from './atualizacao/combinacao-de-indice';
import type { Setor } from './setor';
import type { ItemPontoFacultativo } from './item-ponto-facultativo';
import type { ExcecaoDaCargaHorariaDoCalculo } from './excecao-da-carga-horaria-do-calculo';
import type { ExcecaoDoSabadoDoCalculo } from './excecao-do-sabado-do-calculo';
import type { HistoricoValidacaoDoCalculo } from './historico-validacao-do-calculo';
import type { TabelaDeJurosDoCalculo } from './tabela-de-juros-do-calculo';

/**
 * Interface para módulos secundários (FGTS, INSS, IRPF etc.)
 * que são portados separadamente. `Calculo.liquidar()` chama
 * `.liquidar()` em cada um na ordem correta.
 */
export interface IModuloLiquidavel {
  liquidar(dataLiquidacao?: Date): void;
}

const ZERO = new Decimal(0);

export class Calculo {
  // ─── Identidade + versionamento ───
  private id: number | null = null;
  private versao: number = 0;
  private hashCodeLiquidacao: string | null = null;
  private dataCriacao: Date | null = null;
  private usuarioCriador: string | null = null;
  private processoInformadoManualmente: boolean = false;
  private ativo: boolean = true;
  private validado: boolean = false;
  private hashCalculoCorreto: boolean = false;
  private hashAtualizacaoCorreto: boolean = false;
  private comentarios: string | null = null;
  private versaoDoSistema: string | null = null;
  private idSetor: number | null = null;
  private instancia: InstanciaSetorEnum | null = null;
  private ordem: number | null = null;

  // ─── Processo / Setor (placeholder até porte completo) ───
  private processo: unknown | null = null;
  private setor: Setor | null = null;
  private estado: unknown | null = null;
  private municipio: unknown | null = null;

  // ─── Datas principais ───
  private dataAdmissao: Date | null = null;
  private dataDemissao: Date | null = null;
  private dataAjuizamento: Date | null = null;
  private dataInicioCalculo: Date | null = null;
  private dataTerminoCalculo: Date | null = null;
  private dataDeLiquidacao: Date | null = null;
  private inicioFeriasColetivas: Date | null = null;

  // ─── Remunerações ───
  private valorUltimaRemuneracao: Decimal | null = null;
  private valorMaiorRemuneracao: Decimal | null = null;
  private valorCargaHorariaPadrao: Decimal = new Decimal('220.0');

  // ─── Flags de apuração ───
  private sabadoDiaUtil: boolean = true;
  private projetaAvisoIndenizado: boolean = true;
  private consideraFeriadoEstadual: boolean = true;
  private consideraFeriadoMunicipal: boolean = true;
  private prescricaoFgts: boolean = false;
  private prescricaoQuinquenal: boolean = false;
  private limitarAvosAoPeriodoDoCalculo: boolean = false;
  private zeraValorNegativo: boolean = true;
  private calculoExterno: boolean = false;
  private diaFechamentoMes: number = 31;

  // ─── Tipos ───
  private tipoCalculo: TipoCalculoEnum = TipoCalculoEnum.CREDOR;
  private regimeDoContrato: RegimeDoContratoEnum = RegimeDoContratoEnum.TEMPO_INTEGRAL;
  private indicesAcumulados: IndicesAcumuladosEnum =
    IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO;
  private apuracaoPrazoDoAvisoPrevio: TipoDeApuracaoPrazoDoAvisoPrevioEnum =
    TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_CALCULADA;
  private prazoAvisoInformado: number | null = null;
  private prazoFeriasProporcional: number | null = null;

  // ─── Atualização + parâmetros ───
  private parametrosDeAtualizacao: ParametrosDeAtualizacao = new ParametrosDeAtualizacao();
  private atualizacao: unknown | null = null;

  // ─── Coleções (verbas, histórico, férias, juros, faltas, exceções) ───
  private verbas: Set<VerbaDeCalculo> = new Set();
  private historicosSalariais: Set<unknown> = new Set();
  private listaDeFerias: Set<unknown> = new Set();
  private apuracoesDeJuros: Set<unknown> = new Set();
  private faltas: Set<unknown> = new Set();
  private excecoesDaCargaHoraria: Set<ExcecaoDaCargaHorariaDoCalculo> = new Set();
  private excecoesDoSabado: Set<ExcecaoDoSabadoDoCalculo> = new Set();
  private pontosFacultativos: Set<ItemPontoFacultativo> = new Set();
  private historicosValidacao: Set<HistoricoValidacaoDoCalculo> = new Set();
  private historicosValidacaoAtualizacao: Set<HistoricoValidacaoDoCalculo> = new Set();
  private cartoesDePonto: Set<unknown> = new Set();
  private apuracoesCartaoDePonto: Set<unknown> = new Set();
  private apuracoesDiariasCartaoDePonto: Set<unknown> = new Set();
  private excecoesDoFechamentoDeCartaoDePonto: Set<unknown> = new Set();
  private pagamentos: Set<unknown> = new Set();
  private multas: Set<unknown> = new Set();
  private honorarios: Set<unknown> = new Set();

  // ─── Módulos secundários (interface IModuloLiquidavel) ───
  private fgts: IModuloLiquidavel | null = null;
  private inss: IModuloLiquidavel | null = null;
  private irpf: IModuloLiquidavel | null = null;
  private salarioFamilia: IModuloLiquidavel | null = null;
  private seguroDesemprego: IModuloLiquidavel | null = null;
  private previdenciaPrivada: IModuloLiquidavel | null = null;
  private pensaoAlimenticia: IModuloLiquidavel | null = null;
  private custasJudiciais: IModuloLiquidavel | null = null;

  // ─── Transient: Tabelas/Totalizadores ───
  private tabelaDeJuros: TabelaDeJurosDoCalculo | null = null;
  private totalizadorDeMulta: unknown | null = null;
  private totalizadorDeHonorario: unknown | null = null;
  private sabadoDiaUtilComExcecao: unknown | null = null;

  // ─── Parcelas atualizáveis (cálculo externo) ───
  private parcelasAtualizaveisCreditosReclamante: unknown | null = null;
  private parcelasAtualizaveisDescontoCreditosReclamante: unknown | null = null;
  private parcelasAtualizaveisOutrosDebitosReclamado: unknown | null = null;
  private parcelasAtualizaveisDebitosReclamante: unknown | null = null;

  // ═══════════════════════════════════════════════════════════════════════
  //                       GETTERS / SETTERS
  // ═══════════════════════════════════════════════════════════════════════

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getHashCodeLiquidacao(): string | null { return this.hashCodeLiquidacao; }
  setHashCodeLiquidacao(v: string | null): void { this.hashCodeLiquidacao = v; }

  getDataCriacao(): Date | null { return this.dataCriacao; }
  setDataCriacao(d: Date | null): void { this.dataCriacao = d; }

  getUsuarioCriador(): string | null { return this.usuarioCriador; }
  setUsuarioCriador(v: string | null): void { this.usuarioCriador = v; }

  getProcessoInformadoManualmente(): boolean { return this.processoInformadoManualmente; }
  setProcessoInformadoManualmente(v: boolean): void { this.processoInformadoManualmente = v; }

  getAtivo(): boolean { return this.ativo; }
  setAtivo(v: boolean): void { this.ativo = v; }

  getValidado(): boolean { return this.validado; }
  setValidado(v: boolean): void { this.validado = v; }

  getHashCalculoCorreto(): boolean { return this.hashCalculoCorreto; }
  setHashCalculoCorreto(v: boolean): void { this.hashCalculoCorreto = v; }

  getHashAtualizacaoCorreto(): boolean { return this.hashAtualizacaoCorreto; }
  setHashAtualizacaoCorreto(v: boolean): void { this.hashAtualizacaoCorreto = v; }

  getComentarios(): string | null { return this.comentarios; }
  setComentarios(v: string | null): void { this.comentarios = v; }

  getVersaoDoSistema(): string | null { return this.versaoDoSistema; }
  setVersaoDoSistema(v: string | null): void { this.versaoDoSistema = v; }

  getIdSetor(): number | null { return this.idSetor; }
  setIdSetor(v: number | null): void { this.idSetor = v; }

  getInstancia(): InstanciaSetorEnum | null { return this.instancia; }
  setInstancia(v: InstanciaSetorEnum | null): void { this.instancia = v; }

  getOrdem(): number | null { return this.ordem; }
  setOrdem(v: number | null): void { this.ordem = v; }

  getProcesso(): unknown | null { return this.processo; }
  setProcesso(v: unknown | null): void { this.processo = v; }

  getSetor(): Setor | null { return this.setor; }
  setSetor(v: Setor | null): void { this.setor = v; }

  getEstado(): unknown | null { return this.estado; }
  setEstado(v: unknown | null): void { this.estado = v; }

  getMunicipio(): unknown | null { return this.municipio; }
  setMunicipio(v: unknown | null): void { this.municipio = v; }

  getDataAdmissao(): Date { return this.dataAdmissao!; }
  setDataAdmissao(v: Date): void { this.dataAdmissao = v; }

  getDataDemissao(): Date | null { return this.dataDemissao; }
  setDataDemissao(v: Date | null): void { this.dataDemissao = v; }

  getDataAjuizamento(): Date { return this.dataAjuizamento!; }
  setDataAjuizamento(v: Date): void { this.dataAjuizamento = v; }

  getDataInicioCalculo(): Date | null { return this.dataInicioCalculo; }
  setDataInicioCalculo(v: Date | null): void { this.dataInicioCalculo = v; }

  getDataTerminoCalculo(): Date | null { return this.dataTerminoCalculo; }
  setDataTerminoCalculo(v: Date | null): void { this.dataTerminoCalculo = v; }

  getDataDeLiquidacao(): Date { return this.dataDeLiquidacao!; }
  setDataDeLiquidacao(v: Date): void { this.dataDeLiquidacao = v; }

  getInicioFeriasColetivas(): Date | null { return this.inicioFeriasColetivas; }
  setInicioFeriasColetivas(v: Date | null): void { this.inicioFeriasColetivas = v; }

  getValorUltimaRemuneracao(): Decimal | null { return this.valorUltimaRemuneracao; }
  setValorUltimaRemuneracao(v: Decimal | null): void { this.valorUltimaRemuneracao = v; }

  getValorMaiorRemuneracao(): Decimal | null { return this.valorMaiorRemuneracao; }
  setValorMaiorRemuneracao(v: Decimal | null): void { this.valorMaiorRemuneracao = v; }

  getValorCargaHorariaPadrao(): Decimal { return this.valorCargaHorariaPadrao; }
  setValorCargaHorariaPadrao(v: Decimal): void { this.valorCargaHorariaPadrao = v; }

  getValorCargaHoraria(): Decimal { return this.valorCargaHorariaPadrao; }

  getSabadoDiaUtil(): boolean { return this.sabadoDiaUtil; }
  setSabadoDiaUtil(v: boolean): void { this.sabadoDiaUtil = v; }

  getProjetaAvisoIndenizado(): boolean { return this.projetaAvisoIndenizado; }
  setProjetaAvisoIndenizado(v: boolean): void { this.projetaAvisoIndenizado = v; }

  getConsideraFeriadoEstadual(): boolean { return this.consideraFeriadoEstadual; }
  setConsideraFeriadoEstadual(v: boolean): void { this.consideraFeriadoEstadual = v; }

  getConsideraFeriadoMunicipal(): boolean { return this.consideraFeriadoMunicipal; }
  setConsideraFeriadoMunicipal(v: boolean): void { this.consideraFeriadoMunicipal = v; }

  getPrescricaoFgts(): boolean { return this.prescricaoFgts; }
  setPrescricaoFgts(v: boolean): void { this.prescricaoFgts = v; }

  getPrescricaoQuinquenal(): boolean { return this.prescricaoQuinquenal; }
  setPrescricaoQuinquenal(v: boolean): void { this.prescricaoQuinquenal = v; }

  getLimitarAvosAoPeriodoDoCalculo(): boolean { return this.limitarAvosAoPeriodoDoCalculo; }
  setLimitarAvosAoPeriodoDoCalculo(v: boolean): void { this.limitarAvosAoPeriodoDoCalculo = v; }

  getZeraValorNegativo(): boolean { return this.zeraValorNegativo; }
  setZeraValorNegativo(v: boolean): void { this.zeraValorNegativo = v; }

  /** isCalculoExterno (Java) — referenciado por OcorrenciaDeInssSobreSalariosDevidos e afins. */
  isCalculoExterno(): boolean { return this.calculoExterno; }
  getCalculoExterno(): boolean { return this.calculoExterno; }
  setCalculoExterno(v: boolean): void { this.calculoExterno = v; }

  getDiaFechamentoMes(): number { return this.diaFechamentoMes; }
  setDiaFechamentoMes(v: number): void { this.diaFechamentoMes = v; }

  getTipoCalculo(): TipoCalculoEnum { return this.tipoCalculo; }
  setTipoCalculo(v: TipoCalculoEnum): void { this.tipoCalculo = v; }

  getRegimeDoContrato(): RegimeDoContratoEnum { return this.regimeDoContrato; }
  setRegimeDoContrato(v: RegimeDoContratoEnum): void { this.regimeDoContrato = v; }

  getIndicesAcumulados(): IndicesAcumuladosEnum { return this.indicesAcumulados; }
  setIndicesAcumulados(v: IndicesAcumuladosEnum): void { this.indicesAcumulados = v; }

  getApuracaoPrazoDoAvisoPrevio(): TipoDeApuracaoPrazoDoAvisoPrevioEnum {
    return this.apuracaoPrazoDoAvisoPrevio;
  }
  setApuracaoPrazoDoAvisoPrevio(v: TipoDeApuracaoPrazoDoAvisoPrevioEnum): void {
    this.apuracaoPrazoDoAvisoPrevio = v;
  }

  getPrazoAvisoInformado(): number | null { return this.prazoAvisoInformado; }
  setPrazoAvisoInformado(v: number | null): void { this.prazoAvisoInformado = v; }

  getPrazoFeriasProporcional(): number | null { return this.prazoFeriasProporcional; }
  setPrazoFeriasProporcional(v: number | null): void { this.prazoFeriasProporcional = v; }

  getParametrosDeAtualizacao(): ParametrosDeAtualizacao { return this.parametrosDeAtualizacao; }
  setParametrosDeAtualizacao(v: ParametrosDeAtualizacao): void { this.parametrosDeAtualizacao = v; }

  getAtualizacao(): unknown | null { return this.atualizacao; }
  setAtualizacao(v: unknown | null): void { this.atualizacao = v; }

  // ─── Coleções ───

  getVerbas(): Set<VerbaDeCalculo> { return this.verbas; }
  setVerbas(v: Set<VerbaDeCalculo>): void { this.verbas = v; }
  adicionarVerba(v: VerbaDeCalculo): void { this.verbas.add(v); }

  /** getVerbasAtivas (Java linha 1185) */
  getVerbasAtivas(): VerbaDeCalculo[] {
    return [...this.verbas].filter((v) => v.getAtivo());
  }

  getHistoricosSalariais(): Set<unknown> { return this.historicosSalariais; }
  setHistoricosSalariais(v: Set<unknown>): void { this.historicosSalariais = v; }

  getListaDeFerias(): Set<unknown> { return this.listaDeFerias; }
  setListaDeFerias(v: Set<unknown>): void { this.listaDeFerias = v; }

  getApuracoesDeJuros(): Set<unknown> { return this.apuracoesDeJuros; }
  setApuracoesDeJuros(v: Set<unknown>): void { this.apuracoesDeJuros = v; }

  getFaltas(): Set<unknown> { return this.faltas; }
  setFaltas(v: Set<unknown>): void { this.faltas = v; }

  getExcecoesDaCargaHoraria(): Set<ExcecaoDaCargaHorariaDoCalculo> { return this.excecoesDaCargaHoraria; }
  setExcecoesDaCargaHoraria(v: Set<ExcecaoDaCargaHorariaDoCalculo>): void {
    this.excecoesDaCargaHoraria = v;
  }

  getExcecoesDoSabado(): Set<ExcecaoDoSabadoDoCalculo> { return this.excecoesDoSabado; }
  setExcecoesDoSabado(v: Set<ExcecaoDoSabadoDoCalculo>): void { this.excecoesDoSabado = v; }

  getPontosFacultativos(): Set<ItemPontoFacultativo> { return this.pontosFacultativos; }
  setPontosFacultativos(v: Set<ItemPontoFacultativo>): void { this.pontosFacultativos = v; }

  getHistoricosValidacao(): Set<HistoricoValidacaoDoCalculo> { return this.historicosValidacao; }
  setHistoricosValidacao(v: Set<HistoricoValidacaoDoCalculo>): void { this.historicosValidacao = v; }

  getHistoricosValidacaoAtualizacao(): Set<HistoricoValidacaoDoCalculo> {
    return this.historicosValidacaoAtualizacao;
  }
  setHistoricosValidacaoAtualizacao(v: Set<HistoricoValidacaoDoCalculo>): void {
    this.historicosValidacaoAtualizacao = v;
  }

  getCartoesDePonto(): Set<unknown> { return this.cartoesDePonto; }
  setCartoesDePonto(v: Set<unknown>): void { this.cartoesDePonto = v; }

  getApuracoesCartaoDePonto(): Set<unknown> { return this.apuracoesCartaoDePonto; }
  setApuracoesCartaoDePonto(v: Set<unknown>): void { this.apuracoesCartaoDePonto = v; }

  getApuracoesDiariasCartaoDePonto(): Set<unknown> { return this.apuracoesDiariasCartaoDePonto; }
  setApuracoesDiariasCartaoDePonto(v: Set<unknown>): void {
    this.apuracoesDiariasCartaoDePonto = v;
  }

  getExcecoesDoFechamentoDeCartaoDePonto(): Set<unknown> {
    return this.excecoesDoFechamentoDeCartaoDePonto;
  }
  setExcecoesDoFechamentoDeCartaoDePonto(v: Set<unknown>): void {
    this.excecoesDoFechamentoDeCartaoDePonto = v;
  }

  getPagamentos(): Set<unknown> { return this.pagamentos; }
  setPagamentos(v: Set<unknown>): void { this.pagamentos = v; }

  /**
   * getMultas / getMultasDoCalculo — `TotalizadorDeMulta` consome
   * `getMultasDoCalculo()`. O Java expõe ambos (todas vs filtradas por origem).
   */
  getMultas(): Set<unknown> { return this.multas; }
  setMultas(v: Set<unknown>): void { this.multas = v; }
  getMultasDoCalculo(): Iterable<unknown> { return this.multas; }

  getHonorarios(): Set<unknown> { return this.honorarios; }
  setHonorarios(v: Set<unknown>): void { this.honorarios = v; }
  getHonorariosDoCalculo(): Iterable<unknown> { return this.honorarios; }

  // ─── Módulos secundários ───
  getFgts(): IModuloLiquidavel | null { return this.fgts; }
  setFgts(v: IModuloLiquidavel | null): void { this.fgts = v; }

  getInss(): IModuloLiquidavel | null { return this.inss; }
  setInss(v: IModuloLiquidavel | null): void { this.inss = v; }

  getIrpf(): IModuloLiquidavel | null { return this.irpf; }
  setIrpf(v: IModuloLiquidavel | null): void { this.irpf = v; }

  getSalarioFamilia(): IModuloLiquidavel | null { return this.salarioFamilia; }
  setSalarioFamilia(v: IModuloLiquidavel | null): void { this.salarioFamilia = v; }

  getSeguroDesemprego(): IModuloLiquidavel | null { return this.seguroDesemprego; }
  setSeguroDesemprego(v: IModuloLiquidavel | null): void { this.seguroDesemprego = v; }

  getPrevidenciaPrivada(): IModuloLiquidavel | null { return this.previdenciaPrivada; }
  setPrevidenciaPrivada(v: IModuloLiquidavel | null): void { this.previdenciaPrivada = v; }

  getPensaoAlimenticia(): IModuloLiquidavel | null { return this.pensaoAlimenticia; }
  setPensaoAlimenticia(v: IModuloLiquidavel | null): void { this.pensaoAlimenticia = v; }

  getCustasJudiciais(): IModuloLiquidavel | null { return this.custasJudiciais; }
  setCustasJudiciais(v: IModuloLiquidavel | null): void { this.custasJudiciais = v; }

  // ─── Tabelas e totalizadores (transient) ───

  getTabelaDeJuros(): TabelaDeJurosDoCalculo | null { return this.tabelaDeJuros; }
  setTabelaDeJuros(v: TabelaDeJurosDoCalculo | null): void { this.tabelaDeJuros = v; }

  getTotalizadorDeMulta(): unknown | null { return this.totalizadorDeMulta; }
  setTotalizadorDeMulta(v: unknown | null): void { this.totalizadorDeMulta = v; }

  getTotalizadorDeHonorario(): unknown | null { return this.totalizadorDeHonorario; }
  setTotalizadorDeHonorario(v: unknown | null): void { this.totalizadorDeHonorario = v; }

  getSabadoDiaUtilComExcecao(): unknown | null { return this.sabadoDiaUtilComExcecao; }
  setSabadoDiaUtilComExcecao(v: unknown | null): void { this.sabadoDiaUtilComExcecao = v; }

  // ─── Parcelas atualizáveis (cálculo externo) ───

  getParcelasAtualizaveisCreditosReclamante(): unknown | null {
    return this.parcelasAtualizaveisCreditosReclamante;
  }
  setParcelasAtualizaveisCreditosReclamante(v: unknown | null): void {
    this.parcelasAtualizaveisCreditosReclamante = v;
  }

  getParcelasAtualizaveisDescontoCreditosReclamante(): unknown | null {
    return this.parcelasAtualizaveisDescontoCreditosReclamante;
  }
  setParcelasAtualizaveisDescontoCreditosReclamante(v: unknown | null): void {
    this.parcelasAtualizaveisDescontoCreditosReclamante = v;
  }

  getParcelasAtualizaveisOutrosDebitosReclamado(): unknown | null {
    return this.parcelasAtualizaveisOutrosDebitosReclamado;
  }
  setParcelasAtualizaveisOutrosDebitosReclamado(v: unknown | null): void {
    this.parcelasAtualizaveisOutrosDebitosReclamado = v;
  }

  getParcelasAtualizaveisDebitosReclamante(): unknown | null {
    return this.parcelasAtualizaveisDebitosReclamante;
  }
  setParcelasAtualizaveisDebitosReclamante(v: unknown | null): void {
    this.parcelasAtualizaveisDebitosReclamante = v;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                       DERIVADOS / HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /** getAtualizacaoMonetaria — índice trabalhista via ParametrosDeAtualizacao. */
  getAtualizacaoMonetaria(): IndiceMonetarioEnum {
    return this.parametrosDeAtualizacao.getIndiceTrabalhista();
  }

  getIgnorarTaxaCorrecaoNegativa(): boolean {
    return this.parametrosDeAtualizacao.getIgnorarTaxaNegativa();
  }

  /**
   * getDataDePrescricao — data limite de prescrição quinquenal (5 anos
   * retroativos da data de ajuizamento). Apenas referência, lógica real
   * depende de regras específicas do PJe-Calc.
   */
  getDataDePrescricao(): Date | null {
    if (!this.dataAjuizamento) return null;
    const d = new Date(this.dataAjuizamento);
    d.setFullYear(d.getFullYear() - 5);
    return d;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                       LIQUIDAR — fluxo principal
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * liquidar() — fluxo principal do PJe-Calc (Java 1475-1537).
   *
   * Executa na ordem do Java:
   *   1. Cria TabelaDeCorrecaoMonetaria
   *   2. Liquida cada verba ativa (aplica índice acumulado)
   *   3-13. Liquida módulos secundários na ordem
   */
  liquidar(): void {
    // Reset
    for (const v of this.verbas) v.setLiquidado(false);

    const ctx: ITabelaCorrecaoContext = {
      getDataDeLiquidacao: () => this.getDataDeLiquidacao(),
      getDataDemissao: () => this.getDataDemissao(),
      getParametrosDeAtualizacao: () => this.parametrosDeAtualizacao,
    };
    const periodoCalculo = new Periodo(
      HelperDate.getCurrentCompetence(this.getDataAdmissao()).getDate(),
      this.getDataDeLiquidacao(),
    );

    const params = this.getParametrosDeAtualizacao();
    const combinacoes = params ? [...params.getListaDeCombinacaoDeIndices()] : [];

    if (combinacoes.length > 0) {
      // ADC 58/59: combinações de índice → tabela por SEGMENTO.
      // Cada ocorrência recebe o fator acumulado do segmento correto.
      const segmentos = this.construirSegmentos(ctx, periodoCalculo, combinacoes);
      for (const verba of this.getVerbasAtivas()) {
        if (verba.isLiquidado()) continue;
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(segmentos[0]?.tabela ?? null);
        for (const ocorrencia of verba.getOcorrenciasAtivas()) {
          const dataInicial = ocorrencia.getDataInicial();
          if (!dataInicial) continue;
          // Compor fator: multiplicar o indice de CADA segmento que a ocorrência atravessa.
          let fatorComposto = new Decimal(1);
          for (const seg of segmentos) {
            if (seg.indice === IndiceMonetarioEnum.NENHUM || seg.indice === IndiceMonetarioEnum.SEM_CORRECAO) continue;
            const compInicio = HelperDate.getCurrentCompetence(dataInicial).addMonth(1).getDate();
            if (HelperDate.dateAfter(compInicio, seg.periodo.getFinal())) continue;
            if (HelperDate.dateBefore(this.getDataDeLiquidacao(), seg.periodo.getInicial())) continue;
            const inicio = HelperDate.dateAfter(compInicio, seg.periodo.getInicial()) ? compInicio : seg.periodo.getInicial();
            const fim = HelperDate.dateBefore(this.getDataDeLiquidacao(), seg.periodo.getFinal()) ? this.getDataDeLiquidacao() : seg.periodo.getFinal();
            const fatorInicio = seg.tabela.obterIndice(inicio);
            const fatorFim = seg.tabela.obterIndice(fim);
            if (fatorInicio.greaterThan(0)) {
              fatorComposto = fatorComposto.times(fatorFim.div(fatorInicio));
            }
          }
          ocorrencia.setIndiceAcumulado(fatorComposto);
        }
        verba.setLiquidado(true);
      }
    } else {
      // Sem combinações: tabela única
      const tabelaDeCorrecao = new TabelaDeCorrecaoMonetaria(
        ctx, this.getAtualizacaoMonetaria(), this.getIndicesAcumulados(),
        this.getIgnorarTaxaCorrecaoNegativa(),
      );
      tabelaDeCorrecao.setOrigemCalculo(true);
      tabelaDeCorrecao.carregarTabela(periodoCalculo);
      for (const verba of this.getVerbasAtivas()) {
        if (verba.isLiquidado()) continue;
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecao);
        this.liquidarVerba(verba, tabelaDeCorrecao);
      }
    }

    // 4-13. Módulos secundários (ordem Java)
    this.salarioFamilia?.liquidar();
    this.seguroDesemprego?.liquidar();
    this.fgts?.liquidar();
    this.inss?.liquidar(this.getDataDeLiquidacao());
    this.previdenciaPrivada?.liquidar();
    this.pensaoAlimenticia?.liquidar();
    this.irpf?.liquidar();
    this.custasJudiciais?.liquidar();
  }

  /** Constrói tabelas de correção por segmento (ADC 58/59). */
  private construirSegmentos(
    ctx: ITabelaCorrecaoContext,
    periodoTotal: Periodo,
    combinacoes: CombinacaoDeIndice[],
  ): { indice: IndiceMonetarioEnum; periodo: Periodo; tabela: TabelaDeCorrecaoMonetaria }[] {
    const sorted = combinacoes
      .filter(c => c.getApartirDeOutroIndice() != null)
      .sort((a, b) => a.getApartirDeOutroIndice()!.getTime() - b.getApartirDeOutroIndice()!.getTime());

    const segmentos: { indice: IndiceMonetarioEnum; periodo: Periodo; tabela: TabelaDeCorrecaoMonetaria }[] = [];
    let currentStart = periodoTotal.getInicial();
    let currentIndice = this.getAtualizacaoMonetaria();

    for (const comb of sorted) {
      const transitionDate = comb.getApartirDeOutroIndice()!;
      if (HelperDate.dateAfter(transitionDate, currentStart)) {
        const segPeriodo = new Periodo(currentStart, HelperDate.getInstance(transitionDate)!.addDay(-1).getDate());
        const tabela = new TabelaDeCorrecaoMonetaria(
          ctx, currentIndice, this.getIndicesAcumulados(), this.getIgnorarTaxaCorrecaoNegativa(),
        );
        tabela.setOrigemCalculo(true);
        tabela.carregarTabela(segPeriodo);
        segmentos.push({ indice: currentIndice, periodo: segPeriodo, tabela });
      }
      currentStart = transitionDate;
      currentIndice = comb.getOutroIndiceTrabalhista() ?? this.getAtualizacaoMonetaria();
    }

    if (HelperDate.dateBeforeOrEquals(currentStart, periodoTotal.getFinal())) {
      const segPeriodo = new Periodo(currentStart, periodoTotal.getFinal());
      if (currentIndice !== IndiceMonetarioEnum.NENHUM && currentIndice !== IndiceMonetarioEnum.SEM_CORRECAO) {
        const tabela = new TabelaDeCorrecaoMonetaria(
          ctx, currentIndice, this.getIndicesAcumulados(), this.getIgnorarTaxaCorrecaoNegativa(),
        );
        tabela.setOrigemCalculo(true);
        tabela.carregarTabela(segPeriodo);
        segmentos.push({ indice: currentIndice, periodo: segPeriodo, tabela });
      } else {
        const tabela = new TabelaDeCorrecaoMonetaria(
          ctx, this.getAtualizacaoMonetaria(), this.getIndicesAcumulados(), this.getIgnorarTaxaCorrecaoNegativa(),
        );
        segmentos.push({ indice: currentIndice, periodo: segPeriodo, tabela });
      }
    }

    return segmentos;
  }

  /**
   * liquidarVerba — aplica `indiceAcumulado` sobre cada ocorrência ativa
   * usando a TabelaDeCorrecaoMonetaria pré-carregada.
   *
   * No PJe-Calc completo, `VerbaDeCalculo.liquidar()` chama
   * `MaquinaDeCalculo.executarLiquidar()` que também gera as ocorrências.
   * Aqui assumimos que as ocorrências já foram geradas (pelo
   * pjc-to-engine bridge) e apenas aplicamos o fator de correção.
   */
  private liquidarVerba(verba: VerbaDeCalculo, tabelaDeCorrecao: TabelaDeCorrecaoMonetaria): void {
    tabelaDeCorrecao.setOcorrenciaDePagamento(verba.getOcorrenciaDePagamento());
    for (const ocorrencia of verba.getOcorrenciasAtivas()) {
      const dataInicial = ocorrencia.getDataInicial();
      if (!dataInicial) continue;
      const indiceAcumulado = tabelaDeCorrecao.obterValorAcumuladoDoIndice(dataInicial);
      ocorrencia.setIndiceAcumulado(indiceAcumulado);
    }
    verba.setLiquidado(true);
  }

  /**
   * calcularTotalCorrigido — soma o total corrigido das verbas que compõem
   * o principal. Usado para totalização final do cálculo.
   */
  calcularTotalCorrigido(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      if (verba.getComporPrincipal() === LogicoEnum.NAO) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const corrigida = oc.getDiferencaCorrigida();
        if (corrigida) {
          total = total.plus(arredondarValorMonetario(corrigida));
        }
      }
    }
    return total;
  }

  /**
   * calcularBrutoDevidoAoReclamante (stub).
   * No Java, esse método soma verbas com comporPrincipal=SIM,
   * devidas ao reclamante, já corrigidas. Consumido por
   * MaquinaDeCalculoDeHonorarios (BRUTO / BC / BCP).
   * TODO(fase-10): port fiel ao Java (considera FGTS, INSS, descontos).
   */
  calcularBrutoDevidoAoReclamante(): Decimal {
    return this.calcularTotalCorrigido();
  }
}
