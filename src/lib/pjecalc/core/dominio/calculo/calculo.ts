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
  BaseDeCalculoDoPrincipalEnum,
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  InstanciaSetorEnum,
  LogicoEnum,
  RegimeDoContratoEnum,
  TipoCalculoEnum,
  TipoDeApuracaoPrazoDoAvisoPrevioEnum,
  TipoDeBaseDoFgtsEnum,
  TipoValorEnum,
} from '../../constantes/enums';
import { FormulaCalculada, FormulaInformada, FormulaReflexo } from '../formula/formula';
import { VerbaDeCalculo } from '../verbacalculo/verba-de-calculo';
import type { OcorrenciaDeVerba } from '../ocorrenciaverba/ocorrencia-de-verba';
import {
  TabelaDeCorrecaoMonetaria,
  type ITabelaCorrecaoContext,
} from '../verbacalculo/tabela-de-correcao-monetaria';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';
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

/** Marco jurisprudencial: 13/novembro/2014 — STF ARE 709.212 (prescrição FGTS). */
const TREZE_NOVEMBRO_2014 = new Date(Date.UTC(2014, 10, 13));
/** 13/novembro/2019 — fim do regime de transição quinquenal/trintenal. */
const TREZE_NOVEMBRO_2019 = new Date(Date.UTC(2019, 10, 13));
/** 13/novembro/1989 — CF de 1988 + Lei 8.036/90: 13/11/89 como data-corte FGTS. */
const TREZE_NOVEMBRO_1989 = new Date(Date.UTC(1989, 10, 13));

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
  private relatorioAtualizacao: boolean = false;
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

  /**
   * `isLiquidado` — porte 1-a-1 de Calculo.java:2561-2563.
   * Predicado: cálculo já foi liquidado (dataDeLiquidacao preenchida).
   */
  isLiquidado(): boolean {
    return this.dataDeLiquidacao != null;
  }

  /**
   * `existeDataDeDemissao` — porte 1-a-1 de Calculo.java:2731-2733.
   */
  existeDataDeDemissao(): boolean {
    return this.dataDemissao != null;
  }

  /**
   * `isRelatorioAtualizacao` / `setRelatorioAtualizacao` — Calculo.java:2503-2509.
   * Flag transient que ativa o modo "relatório de atualização"
   * (exibe apenas valores atualizados, oculta detalhe do cálculo original).
   */
  isRelatorioAtualizacao(): boolean { return this.relatorioAtualizacao; }
  setRelatorioAtualizacao(v: boolean): void { this.relatorioAtualizacao = v; }

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

  /**
   * `isPrazoAvisoCalculado` — porte 1-a-1 de Calculo.java:1263-1265.
   * Returns true se `apuracaoPrazoDoAvisoPrevio === APURACAO_CALCULADA`.
   */
  isPrazoAvisoCalculado(): boolean {
    return this.apuracaoPrazoDoAvisoPrevio === TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_CALCULADA;
  }

  /**
   * `isPrazoAvisoInfo` — porte 1-a-1 de Calculo.java:1267-1269.
   * Returns true se `apuracaoPrazoDoAvisoPrevio === APURACAO_INFORMADA`.
   */
  isPrazoAvisoInfo(): boolean {
    return this.apuracaoPrazoDoAvisoPrevio === TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA;
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

  /**
   * `getDataPrescricaoQuinquenal` — porte 1-a-1 de Calculo.java:2626-2629.
   * Alias semântico de `getDataDePrescricao` (prescrição de 5 anos da CLT
   * art. 11 — EC 28/2000). Nome alternativo é o mais usado no código Java.
   */
  getDataPrescricaoQuinquenal(): Date | null {
    if (!this.dataAjuizamento) return null;
    return HelperDate.getInstance(this.dataAjuizamento).addYear(-5).getDate();
  }

  /**
   * `getDataPrescricaoFgts` — porte 1-a-1 de Calculo.java:2631-2640.
   *
   * Prescrição trintenária (30 anos) do FGTS — **regra geral histórica**
   * até decisão do STF no ARE 709.212 (13/nov/2014). A partir dessa data:
   *   - Ajuizamento **entre 13/11/2014 e 13/11/2019** E admissão
   *     **após 13/11/1989** → prescrição quinquenal (5 anos).
   *   - Ajuizamento **a partir de 13/11/2019** → prescrição quinquenal
   *     integral (regime de transição terminou).
   *   - Demais casos (ajuizamento anterior a 13/11/2014 ou admissão
   *     anterior a 13/11/1989): **trintenária** — 30 anos.
   */
  getDataPrescricaoFgts(): Date | null {
    if (!this.dataAjuizamento) return null;
    const ajuiz = this.dataAjuizamento;
    const admiss = this.dataAdmissao;
    let anosPrescricao = -30;
    if (
      HelperDate.dateAfterOrEquals(ajuiz, TREZE_NOVEMBRO_2014) &&
      HelperDate.dateBefore(ajuiz, TREZE_NOVEMBRO_2019) &&
      admiss != null &&
      HelperDate.dateAfter(admiss, TREZE_NOVEMBRO_1989)
    ) {
      anosPrescricao = -5;
    } else if (HelperDate.dateAfterOrEquals(ajuiz, TREZE_NOVEMBRO_2019)) {
      anosPrescricao = -5;
    }
    return HelperDate.getInstance(ajuiz).addYear(anosPrescricao).getDate();
  }

  /**
   * `isDataDemissaoAnteriorADataPrescricaoQuinquenal` — porte 1-a-1 de
   * Calculo.java:2855-2860.
   *
   * True se:
   *   1. `dataDemissao` existe
   *   2. `prescricaoQuinquenal` está habilitada
   *   3. `dataDemissao < dataPrescricaoQuinquenal`
   *
   * Usado para decidir se todas as verbas estão prescritas (cálculo
   * deve gerar relatório de "prescrição total").
   */
  isDataDemissaoAnteriorADataPrescricaoQuinquenal(): boolean {
    if (this.dataDemissao == null || !this.prescricaoQuinquenal) return false;
    const dataPrescr = this.getDataPrescricaoQuinquenal();
    if (dataPrescr == null) return false;
    return HelperDate.getInstance(this.dataDemissao).lessThen(dataPrescr);
  }

  /**
   * `isDataTerminoCalculoAnteriorADemissao` — porte 1-a-1 de
   * Calculo.java:2862-2866.
   *
   * True se ambas as datas existem e `dataTerminoCalculo < dataDemissao`.
   * Caso típico: cálculo intermediário (ex.: liquidação antes da
   * rescisão efetiva).
   */
  isDataTerminoCalculoAnteriorADemissao(): boolean {
    if (this.dataDemissao == null || this.dataTerminoCalculo == null) return false;
    return HelperDate.dateBefore(this.dataTerminoCalculo, this.dataDemissao);
  }

  /**
   * `obterPeriodoDoCalculo` — porte 1-a-1 de Calculo.java:2595-2620.
   *
   * Monta um `Periodo` respeitando os limites naturais:
   *   - Inicial = max(dataAdmissao, dataInicioCalculo) — quando ambos existem.
   *     Se apenas um dos dois existir, usa esse.
   *   - Final   = min(dataDemissao, dataTerminoCalculo) — análogo.
   *
   * Não seta labels (diferente de `obterPeriodoSugestivoDoCalculo`).
   */
  obterPeriodoDoCalculo(): Periodo {
    const periodo = new Periodo();
    if (this.dataAdmissao != null && this.dataInicioCalculo != null) {
      if (HelperDate.getInstance(this.dataAdmissao).greaterThenOrEquals(this.dataInicioCalculo)) {
        periodo.setInicial(this.dataAdmissao);
      } else {
        periodo.setInicial(this.dataInicioCalculo);
      }
    } else if (this.dataAdmissao != null) {
      periodo.setInicial(this.dataAdmissao);
    } else if (this.dataInicioCalculo != null) {
      periodo.setInicial(this.dataInicioCalculo);
    }
    if (this.dataDemissao != null && this.dataTerminoCalculo != null) {
      if (HelperDate.getInstance(this.dataDemissao).lessThanOrEqualsTo(this.dataTerminoCalculo)) {
        periodo.setFinal(this.dataDemissao);
      } else {
        periodo.setFinal(this.dataTerminoCalculo);
      }
    } else if (this.dataDemissao != null) {
      periodo.setFinal(this.dataDemissao);
    } else if (this.dataTerminoCalculo != null) {
      periodo.setFinal(this.dataTerminoCalculo);
    }
    return periodo;
  }

  /**
   * `obterPeriodoSugestivoDoCalculo` — porte 1-a-1 de
   * Calculo.java:2642-2668 (overload com 2 args) + L2622-2624 (zero args).
   *
   * Diferença para `obterPeriodoDoCalculo`: este **seta labels** de
   * origem em cada data (usado em mensagens de erro), aplica regra de
   * prescrição quinquenal quando `verificarPrescricaoQuinquenal=true`, e
   * troca admissão por início do cálculo se `verificarPeriodoParaFgts=false`.
   *
   * Quando `verificarPeriodoParaFgts=true`, a data inicial é sempre a
   * admissão (relevante para FGTS onde a prescrição histórica é de 30
   * anos a partir da admissão).
   */
  obterPeriodoSugestivoDoCalculo(
    verificarPrescricaoQuinquenal = false,
    verificarPeriodoParaFgts = false,
  ): Periodo {
    const periodo = new Periodo();
    if (this.dataInicioCalculo != null && !verificarPeriodoParaFgts) {
      periodo.setInicial(this.dataInicioCalculo);
      periodo.setLabelDataIncial('Data Início do Cálculo');
    } else if (this.dataAdmissao != null) {
      periodo.setInicial(this.dataAdmissao);
      periodo.setLabelDataIncial('Data de Admissão');
    }
    if (verificarPrescricaoQuinquenal && this.prescricaoQuinquenal && this.dataAjuizamento != null) {
      const dataPrescr = HelperDate.getInstance(this.dataAjuizamento).addYear(-5);
      const inicial = periodo.getInicial();
      if (inicial != null && dataPrescr.greaterThen(inicial)) {
        periodo.setInicial(dataPrescr.getDate());
        periodo.setLabelDataIncial('Data de Prescrição Quinquenal');
      }
    }
    if (this.dataDemissao != null) {
      periodo.setFinal(this.dataDemissao);
      periodo.setLabelDataFinal('Data de Demissão');
    } else if (this.dataTerminoCalculo != null) {
      periodo.setFinal(this.dataTerminoCalculo);
      periodo.setLabelDataFinal('Data Fim do Cálculo');
    }
    return periodo;
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
      // ADC 58/59: combinações de índice → composição explícita por SEGMENTO.
      // Para cada ocorrência, o fator final é o PRODUTO dos fatores de cada
      // segmento que a ocorrência atravessa (de compInicio até dataLiquidacao).
      // Cada fator de segmento é calculado conforme o tipo de índice:
      //   - PRODUTO (IPCA-E, IPCA, INPC, IGP-M, TR, IPCAETR, DFP etc.):
      //       fator_seg = acum(fim) / acum(inicio_anterior)
      //   - SOMA SIMPLES (SELIC, SELIC_FAZENDA, JAM, TABELA_UNICA_JT_*, IT):
      //       fator_seg = 1 + (acum(fim) - acum(inicio_anterior))
      //   - NENHUM/SEM_CORRECAO: fator_seg = 1
      // Súmula 381 TST: correção começa no MÊS SUBSEQUENTE ao vencimento.
      const segmentos = this.construirSegmentos(ctx, periodoCalculo, combinacoes);
      for (const verba of this.getVerbasAtivas()) {
        if (verba.isLiquidado()) continue;
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(segmentos[0]?.tabela ?? null);
        for (const ocorrencia of verba.getOcorrenciasAtivas()) {
          const dataInicial = ocorrencia.getDataInicial();
          if (!dataInicial) continue;
          const fatorComposto = this.composicaoFatorSegmentos(
            dataInicial, segmentos, this.getDataDeLiquidacao(),
          );
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

    // 4-13. Modulos secundarios (ordem Java 1486-1531).
    this.salarioFamilia?.liquidar();
    this.seguroDesemprego?.liquidar();
    this.fgts?.liquidar();
    this.inss?.liquidar(this.getDataDeLiquidacao());
    this.previdenciaPrivada?.liquidar();
    // Java 1519: calcularJuros() entre PrevPriv e PensaoAlimenticia.
    this.calcularJuros();
    this.pensaoAlimenticia?.liquidar();
    // Java 1524-1526: Multas — itera multasDoCalculo + chama liquidar().
    for (const m of this.multas) {
      const multa = m as { liquidar?(): void };
      multa.liquidar?.();
    }
    // Java 1527-1529: Honorarios — itera + liquidar().
    for (const h of this.honorarios) {
      const honor = h as { liquidar?(): void };
      honor.liquidar?.();
    }
    this.irpf?.liquidar();
    this.custasJudiciais?.liquidar();
  }

  /**
   * Java Calculo.calcularJuros (linha 1519 chamada). Itera apuracoesDeJuros
   * e cada modulo (FGTS/INSS/etc) que aplica juros. Implementacao stub
   * que delega para os modulos individuais ja capazes de calcular seus
   * proprios juros (cada *.liquidar() ja popula taxaDeJuros internamente).
   */
  calcularJuros(): void {
    // Java orquestra TabelaDeJurosDoCalculo + apuracoes; aqui delegamos
    // pois cada modulo (FGTS/INSS/PrevPriv/SF/Seguro) ja calcula juros
    // internamente em seu liquidar(). Esta implementacao pode evoluir para
    // 1:1 quando ApuracaoDeJuros entidade for portada.
    const fgts = this.fgts as null | { calcularJuros?(): void };
    const inss = this.inss as null | { calcularJuros?(): void };
    const prev = this.previdenciaPrivada as null | { calcularJuros?(): void };
    const sf = this.salarioFamilia as null | { calcularJuros?(): void };
    const seg = this.seguroDesemprego as null | { calcularJuros?(): void };
    fgts?.calcularJuros?.();
    inss?.calcularJuros?.();
    prev?.calcularJuros?.();
    sf?.calcularJuros?.();
    seg?.calcularJuros?.();
  }

  /**
   * Identifica índices de correção cujo acumulado é SOMA SIMPLES das taxas
   * mensais (metodologia RFB / Súmula 121 STF), em oposição ao regime de
   * PRODUTO (multiplicativo) usado por IPCA-E, IGP-M, INPC etc.
   *
   * Indices "soma simples":
   *   - SELIC, SELIC_FAZENDA, SELIC_BACEN — Súmula 121 STF
   *   - JAM — juros aplicados mensalmente, metodologia acumulativa linear
   *   - TABELA_UNICA_JT_DIARIO / TABELA_UNICA_JT_MENSAL / TUACDT — TRT-8
   *   - TABELA_INDEBITO_TRIBUTARIO (IT) — metodologia Selic-análoga
   *   - TABELA_DEVEDOR_FAZENDA (DFP) — compõe SELIC pós-EC 113/2021
   */
  private ehIndiceSomaSimples(indice: IndiceMonetarioEnum): boolean {
    switch (indice) {
      case IndiceMonetarioEnum.SELIC:
      case IndiceMonetarioEnum.SELIC_FAZENDA:
      case IndiceMonetarioEnum.SELIC_BACEN:
      case IndiceMonetarioEnum.JAM:
      case IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO:
      case IndiceMonetarioEnum.TABELA_UNICA_JT_MENSAL:
      case IndiceMonetarioEnum.TUACDT:
      case IndiceMonetarioEnum.TABELA_INDEBITO_TRIBUTARIO:
      case IndiceMonetarioEnum.TABELA_DEVEDOR_FAZENDA:
        return true;
      default:
        return false;
    }
  }

  /**
   * Calcula o fator de correção composto de uma ocorrência ao longo dos segmentos
   * de correção definidos por ADC 58/59.
   *
   * Para cada segmento:
   *   - efetua recorte [compInicio, min(dataLiquidacao, fimSeg)]
   *   - consulta os índices pré-carregados (IndiceDeCalculo[]) com valorAcumulado
   *     já resolvido pela rotina apropriada (produto vs soma simples)
   *   - calcula o fator do segmento e multiplica no fator composto
   *
   * Regras:
   *   - Súmula 381 TST: compInicio = primeiro dia do MÊS SUBSEQUENTE ao vencimento
   *   - NENHUM/SEM_CORRECAO: fator = 1 (sem efeito)
   *   - Ocorrência antes do 1º segmento: fator = 1 (base sem correção)
   *   - Ocorrência após liquidação: fator = 1 (não atravessa nenhum segmento)
   */
  private composicaoFatorSegmentos(
    dataInicial: Date,
    segmentos: { indice: IndiceMonetarioEnum; periodo: Periodo; tabela: TabelaDeCorrecaoMonetaria; indicesCalc: IndiceDeCalculo[] }[],
    dataLiquidacao: Date,
  ): Decimal {
    // Súmula 381: correção inicia no mês SUBSEQUENTE ao mês de vencimento.
    const compInicio = HelperDate.getCurrentCompetence(dataInicial).addMonth(1).getDate();
    let fatorComposto = new Decimal(1);

    for (const seg of segmentos) {
      if (
        seg.indice === IndiceMonetarioEnum.SEM_CORRECAO ||
        seg.indicesCalc.length === 0
      ) {
        continue; // sem efeito
      }

      // Determinar janela efetiva do segmento [effStart, effEnd]
      const segInicio = seg.periodo.getInicial();
      const segFim = seg.periodo.getFinal();

      // Se ocorrência começa DEPOIS do segmento inteiro, ignora
      if (HelperDate.dateAfter(compInicio, segFim)) continue;
      // Se liquidação acontece ANTES do segmento inteiro, ignora
      if (HelperDate.dateBefore(dataLiquidacao, segInicio)) continue;

      const effStart = HelperDate.dateAfter(compInicio, segInicio) ? compInicio : segInicio;
      const effEnd = HelperDate.dateBefore(dataLiquidacao, segFim) ? dataLiquidacao : segFim;

      // Competências pivot dentro do segmento
      const competEffStart = HelperDate.getCurrentCompetence(effStart).getDate();
      const competEffEnd = HelperDate.getCurrentCompetence(effEnd).getDate();

      // Procurar nos índices do segmento
      //   acumStart — acumulado na competência ANTERIOR a effStart (ou null se effStart é o primeiro).
      //   acumEnd   — acumulado na competência effEnd (ou a última <= effEnd).
      // Se effStart ≤ primeira_competencia, o baseline é implícito (para produto=1, para soma=0)
      const indicesOrdenados = seg.indicesCalc; // já sorted asc por carregarTabela
      let acumStart: Decimal | null = null; // null = baseline (produto:1, soma:0)
      let acumEnd: Decimal | null = null;

      for (const idx of indicesOrdenados) {
        const comp = idx.getCompetencia();
        if (HelperDate.dateBefore(comp, competEffStart)) {
          // compromisso anterior — candidato a acumStart
          acumStart = idx.getValorAcumulado();
        } else if (HelperDate.dateBeforeOrEquals(comp, competEffEnd)) {
          // dentro da janela — atualiza acumEnd
          acumEnd = idx.getValorAcumulado();
        } else {
          break; // após fim — nenhum candidato mais
        }
      }

      if (acumEnd === null) continue; // sem dados no segmento para a janela

      const somaSimples = this.ehIndiceSomaSimples(seg.indice);
      let fatorSeg: Decimal;
      if (somaSimples) {
        // Acumulado SOMA = 1 + Σ(taxas/100). fator janela = 1 + (acumEnd - acumStart).
        // Quando acumStart é null, usa 1 (primeiro mês já contém a taxa do effStart).
        const baseline = acumStart ?? new Decimal(1);
        fatorSeg = new Decimal(1).plus(acumEnd.minus(baseline));
      } else {
        // Acumulado PRODUTO = Π(1+taxa/100). fator janela = acumEnd / acumStart.
        // Quando acumStart é null, baseline = 1.
        const baseline = acumStart ?? new Decimal(1);
        if (baseline.isZero()) continue;
        fatorSeg = acumEnd.div(baseline);
      }

      if (!fatorSeg.isFinite() || fatorSeg.isZero() || fatorSeg.isNegative()) {
        continue; // proteção contra dados corrompidos
      }

      fatorComposto = fatorComposto.times(fatorSeg);
    }

    return fatorComposto;
  }

  /**
   * Constrói segmentos de correção (ADC 58/59) — cada segmento cobre um
   * intervalo contínuo de tempo com um único índice monetário.
   *
   * Retorna, para cada segmento:
   *   - `indice`: enum do índice aplicável no segmento
   *   - `periodo`: janela [início, fim] do segmento
   *   - `tabela`: TabelaDeCorrecaoMonetaria carregada (para compat retroativa)
   *   - `indicesCalc`: lista de IndiceDeCalculo com valorAcumulado pré-computado
   *                    pela rotina apropriada (produto para IPCA-E/IGP-M, soma
   *                    simples para SELIC/SELIC_FAZENDA)
   */
  private construirSegmentos(
    ctx: ITabelaCorrecaoContext,
    periodoTotal: Periodo,
    combinacoes: CombinacaoDeIndice[],
  ): { indice: IndiceMonetarioEnum; periodo: Periodo; tabela: TabelaDeCorrecaoMonetaria; indicesCalc: IndiceDeCalculo[] }[] {
    const sorted = combinacoes
      .filter(c => c.getApartirDeOutroIndice() != null)
      .sort((a, b) => a.getApartirDeOutroIndice()!.getTime() - b.getApartirDeOutroIndice()!.getTime());

    type Segmento = { indice: IndiceMonetarioEnum; periodo: Periodo; tabela: TabelaDeCorrecaoMonetaria; indicesCalc: IndiceDeCalculo[] };
    const segmentos: Segmento[] = [];
    let currentStart = periodoTotal.getInicial();
    let currentIndice = this.getAtualizacaoMonetaria();

    const makeSegmento = (indice: IndiceMonetarioEnum, periodo: Periodo): Segmento => {
      const tabela = new TabelaDeCorrecaoMonetaria(
        ctx, indice, this.getIndicesAcumulados(), this.getIgnorarTaxaCorrecaoNegativa(),
      );
      tabela.setOrigemCalculo(true);
      let indicesCalc: IndiceDeCalculo[] = [];
      if (indice !== IndiceMonetarioEnum.SEM_CORRECAO) {
        try {
          tabela.carregarTabela(periodo);
          // Busca a lista bruta de IndiceDeCalculo (com valorAcumulado por taxa)
          indicesCalc = tabela.obterIndicesDeCalculo(indice, periodo);
        } catch {
          // Índice desconhecido para a versão — tratar como sem correção.
          indicesCalc = [];
        }
      }
      return { indice, periodo, tabela, indicesCalc };
    };

    for (const comb of sorted) {
      const transitionDate = comb.getApartirDeOutroIndice()!;
      if (HelperDate.dateAfter(transitionDate, currentStart)) {
        const segPeriodo = new Periodo(
          currentStart,
          HelperDate.getInstance(transitionDate)!.addDay(-1).getDate(),
        );
        segmentos.push(makeSegmento(currentIndice, segPeriodo));
      }
      currentStart = transitionDate;
      currentIndice = comb.getOutroIndiceTrabalhista() ?? this.getAtualizacaoMonetaria();
    }

    if (HelperDate.dateBeforeOrEquals(currentStart, periodoTotal.getFinal())) {
      const segPeriodo = new Periodo(currentStart, periodoTotal.getFinal());
      segmentos.push(makeSegmento(currentIndice, segPeriodo));
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
   * Java Calculo.obterFaltasNaoJustificadas (linha 1096) — soma dias de
   * faltas nao justificadas que coincidem com o periodo informado.
   */
  obterFaltasNaoJustificadas(periodo: { inicial: Date; final: Date } | { inicial: Date | null; final: Date | null }): number {
    if (!periodo.inicial || !periodo.final) return 0;
    let total = 0;
    for (const f of this.faltas) {
      const falta = f as {
        getFaltaJustificada?(): boolean;
        getPeriodoDaExcecao?(): { totalDeDiasCoincidentesComEste?(p: unknown): number };
      };
      if (falta.getFaltaJustificada?.()) continue;
      const dias = falta.getPeriodoDaExcecao?.().totalDeDiasCoincidentesComEste?.(periodo) ?? 0;
      total += dias;
    }
    return total;
  }

  /** Java Calculo.obterFaltasJustificadas (linha 1121). */
  obterFaltasJustificadas(periodo: { inicial: Date | null; final: Date | null }): number {
    if (!periodo.inicial || !periodo.final) return 0;
    let total = 0;
    for (const f of this.faltas) {
      const falta = f as {
        getFaltaJustificada?(): boolean;
        getPeriodoDaExcecao?(): { totalDeDiasCoincidentesComEste?(p: unknown): number };
      };
      if (!falta.getFaltaJustificada?.()) continue;
      const dias = falta.getPeriodoDaExcecao?.().totalDeDiasCoincidentesComEste?.(periodo) ?? 0;
      total += dias;
    }
    return total;
  }

  /**
   * Java Calculo.obterDiasFerias (linha 1146) — soma dias de ferias gozadas
   * (3 periodos possiveis: gozo1, gozo2, gozo3) coincidentes com o periodo.
   */
  obterDiasFerias(periodo: { inicial: Date | null; final: Date | null }): number {
    if (!periodo.inicial || !periodo.final) return 0;
    let total = 0;
    for (const f of this.listaDeFerias) {
      const ferias = f as {
        getPeriodoDeGozo1?(): { totalDeDiasCoincidentesComEste?(p: unknown): number; isValido?(): boolean } | null;
        getPeriodoDeGozo2?(): { totalDeDiasCoincidentesComEste?(p: unknown): number; isValido?(): boolean } | null;
        getPeriodoDeGozo3?(): { totalDeDiasCoincidentesComEste?(p: unknown): number; isValido?(): boolean } | null;
      };
      const g1 = ferias.getPeriodoDeGozo1?.();
      const g2 = ferias.getPeriodoDeGozo2?.();
      const g3 = ferias.getPeriodoDeGozo3?.();
      if (g1) total += g1.totalDeDiasCoincidentesComEste?.(periodo) ?? 0;
      if (g2) total += g2.totalDeDiasCoincidentesComEste?.(periodo) ?? 0;
      if (g3) total += g3.totalDeDiasCoincidentesComEste?.(periodo) ?? 0;
    }
    return total;
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
   * Java Calculo.getTotalDeValorCorrigidoDaApuracaoDeJuros (linha 2405).
   * Soma diferencaCorrigidaParaCalculoDasIncidencias de cada ocorrencia ativa
   * que tem juros aplicaveis (Java itera apuracoesDeJuros). Aproximacao TS:
   * itera verbas ativas com comporPrincipal=SIM/N null e suas ocorrencias.
   */
  getTotalDeValorCorrigidoDaApuracaoDeJuros(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      if (verba.getComporPrincipal() === LogicoEnum.NAO) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const base = oc.getDiferencaCorrigidaParaCalculoDasIncidencias?.()
          ?? oc.getDiferencaCorrigida();
        if (base) total = total.plus(arredondarValorMonetario(base));
      }
    }
    return total;
  }

  /**
   * Java Calculo.getTotalDeJurosDaApuracaoDeJuros (linha 2425).
   * Soma juros consolidados de todas as ocorrencias.
   */
  getTotalDeJurosDaApuracaoDeJuros(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      for (const oc of verba.getOcorrenciasAtivas()) {
        const juros = oc.getValorDeJuros?.();
        if (juros) total = total.plus(juros);
      }
    }
    return total;
  }

  /** Java Calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfDecimoTerceiro (linha 2436). */
  getTotalDeJurosDaApuracaoDeJurosParaIrpfDecimoTerceiro(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      if (!verba.isCaracteristicaDecimoTerceiro?.()) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const juros = oc.getValorDeJuros?.();
        if (juros) total = total.plus(juros);
      }
    }
    return total;
  }

  /** Java Calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfFerias (linha 2447). */
  getTotalDeJurosDaApuracaoDeJurosParaIrpfFerias(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      if (!verba.isCaracteristicaFerias?.()) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const juros = oc.getValorDeJuros?.();
        if (juros) total = total.plus(juros);
      }
    }
    return total;
  }

  /** Java Calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfDemaisVerbas (linha 2458). */
  getTotalDeJurosDaApuracaoDeJurosParaIrpfDemaisVerbas(): Decimal {
    let total: Decimal = ZERO;
    for (const verba of this.getVerbasAtivas()) {
      if (verba.isCaracteristicaDecimoTerceiro?.() || verba.isCaracteristicaFerias?.()) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const juros = oc.getValorDeJuros?.();
        if (juros) total = total.plus(juros);
      }
    }
    return total;
  }

  /** Java Calculo.getTotalGeralDaApuracaoDeJuros (linha 2469). */
  getTotalGeralDaApuracaoDeJuros(): Decimal {
    return this.getTotalDeValorCorrigidoDaApuracaoDeJuros().plus(this.getTotalDeJurosDaApuracaoDeJuros());
  }

  /**
   * Java Calculo.getValorTotalMultasDoTipoReclamanteReclamado (linha 2305).
   * Soma valor das multas com Devedor=RECLAMANTE, Credor=RECLAMADO.
   * Implementacao defensiva — `multas` eh Set<unknown> ate a entidade Multa
   * ser totalmente portada. Usa narrow via duck-typing.
   */
  getValorTotalMultasDoTipoReclamanteReclamado(): Decimal {
    return this.somarMultasFiltrando(m => {
      const dev = (m as { getTipoDevedor?(): string }).getTipoDevedor?.();
      const cred = (m as { getTipoCredor?(): string }).getTipoCredor?.();
      return dev === 'RECLAMANTE' && cred === 'RECLAMADO';
    });
  }

  /** Java Calculo.getValorTotalMultasDoTipoReclamadoReclamante (linha 2309). */
  getValorTotalMultasDoTipoReclamadoReclamante(): Decimal {
    return this.somarMultasFiltrando(m => {
      const dev = (m as { getTipoDevedor?(): string }).getTipoDevedor?.();
      const cred = (m as { getTipoCredor?(): string }).getTipoCredor?.();
      return dev === 'RECLAMADO' && cred === 'RECLAMANTE';
    });
  }

  /** Java Calculo.getValorTotalMultasDoTipoTerceiroReclamado (linha 2313). */
  getValorTotalMultasDoTipoTerceiroReclamado(): Decimal {
    return this.somarMultasFiltrando(m => {
      const dev = (m as { getTipoDevedor?(): string }).getTipoDevedor?.();
      const cred = (m as { getTipoCredor?(): string }).getTipoCredor?.();
      return dev === 'TERCEIRO' && cred === 'RECLAMADO';
    });
  }

  /** Java Calculo.getValorTotalHonorariosDevidosPeloReclamante (linha 2317). */
  getValorTotalHonorariosDevidosPeloReclamante(): Decimal {
    return this.somarHonorariosFiltrando(h => {
      const dev = (h as { getDevedor?(): string }).getDevedor?.();
      return dev === 'RECLAMANTE';
    });
  }

  /** Java Calculo.getValorTotalHonorariosDevidosPeloReclamado (linha 2321). */
  getValorTotalHonorariosDevidosPeloReclamado(): Decimal {
    return this.somarHonorariosFiltrando(h => {
      const dev = (h as { getDevedor?(): string }).getDevedor?.();
      return dev === 'RECLAMADO';
    });
  }

  /** Helper interno para iterar multas com narrow defensivo. */
  private somarMultasFiltrando(predicado: (m: unknown) => boolean): Decimal {
    let total: Decimal = ZERO;
    for (const m of this.multas) {
      if (!predicado(m)) continue;
      const v = (m as { getValor?(): Decimal }).getValor?.();
      if (v) total = total.plus(v);
    }
    return total;
  }

  /** Helper interno para iterar honorarios com narrow defensivo. */
  private somarHonorariosFiltrando(predicado: (h: unknown) => boolean): Decimal {
    let total: Decimal = ZERO;
    for (const h of this.honorarios) {
      if (!predicado(h)) continue;
      const v = (h as { getValor?(): Decimal }).getValor?.();
      if (v) total = total.plus(v);
    }
    return total;
  }

  /**
   * Java Calculo.calcularBrutoDevidoAoReclamante (linha 2511) — port 1:1.
   * Bruto devido = correcao de juros + juros + FGTS (se compor) + multa FGTS
   * + multa Art.467 - depositos (se deduzir) + SF (se compor) + Seguro
   * (se compor) + multas Reclamante→Reclamado - multas Reclamado→Reclamante.
   *
   * Anterior: stub = calcularTotalCorrigido(). Sai do TODO(fase-10).
   */
  calcularBrutoDevidoAoReclamante(): Decimal {
    let total: Decimal = this.getTotalDeValorCorrigidoDaApuracaoDeJuros()
      .plus(this.getTotalDeJurosDaApuracaoDeJuros());

    // FGTS — se comporOPrincipal
    const fgts = this.fgts as null | {
      isComporOPrincipal?(): boolean;
      getTotalDoFgts?(modo?: unknown): Decimal;
      getTotalDaMultaDoFgts?(): Decimal;
      getTotalDaMultaDoArtigo467?(): Decimal;
      getDeduzirDoFGTS?(): boolean;
      getTotalGeralDoDepositadoOuSacado?(modo?: unknown): Decimal;
    };
    if (fgts?.isComporOPrincipal?.()) {
      total = total.plus(fgts.getTotalDoFgts?.() ?? ZERO);
      total = total.plus(fgts.getTotalDaMultaDoFgts?.() ?? ZERO);
      total = total.plus(fgts.getTotalDaMultaDoArtigo467?.() ?? ZERO);
      if (fgts.getDeduzirDoFGTS?.()) {
        total = total.minus(fgts.getTotalGeralDoDepositadoOuSacado?.() ?? ZERO);
      }
    }

    // Salario Familia — se apurar + comporOPrincipal
    const sf = this.salarioFamilia as null | {
      getApurarSalarioFamilia?(): boolean;
      isComporOPrincipal?(): boolean;
      getTotalGeral?(): Decimal;
      getValorTotalDoSalarioFamilia?(): Decimal;
    };
    if (sf?.getApurarSalarioFamilia?.() && sf?.isComporOPrincipal?.()) {
      total = total.plus(sf.getTotalGeral?.() ?? sf.getValorTotalDoSalarioFamilia?.() ?? ZERO);
    }

    // Seguro Desemprego — se apurar + comporOPrincipal
    const seg = this.seguroDesemprego as null | {
      getApurarSeguroDesemprego?(): boolean;
      isComporOPrincipal?(): boolean;
      getTotal?(): Decimal;
      getValorSeguroDesemprego?(): Decimal;
    };
    if (seg?.getApurarSeguroDesemprego?.() && seg?.isComporOPrincipal?.()) {
      total = total.plus(seg.getTotal?.() ?? seg.getValorSeguroDesemprego?.() ?? ZERO);
    }

    // Multas
    total = total.plus(this.getValorTotalMultasDoTipoReclamanteReclamado());
    total = total.minus(this.getValorTotalMultasDoTipoReclamadoReclamante());

    return total;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                     VALIDACOES (Java 2012-2060)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * `validarVerbaPossuiQuantidade` — porte 1-a-1 de Calculo.java:2012-2017.
   *
   * Para cada verba: se NAO e informada e a Formula(Reflexo) nao tem
   * quantidade, lanca NegocioException (MSG0019). No port: lanca Error
   * com a mesma mensagem-chave para preservar contrato a montante.
   *
   * Considera somente FormulaReflexo (Java usa `getFormula(FormulaReflexo.class)`,
   * que retorna null para outras subclasses → o predicado dispara).
   */
  validarVerbaPossuiQuantidade(): void {
    for (const verba of this.verbas) {
      const formula = verba.getFormula();
      // Java: !verba.isInformada() && (FormulaReflexo)verba.getFormula().getQuantidade() != null
      // Na ausencia de isInformada() em VerbaDeCalculo, usamos o equivalente:
      // formula instanceof FormulaInformada → considera "informada".
      if (formula instanceof FormulaInformada) continue;
      if (formula instanceof FormulaReflexo && formula.quantidade?.valorInformado != null) continue;
      throw new Error(`MSG0019: ${verba.getNome()}`);
    }
  }

  /**
   * `validarDisponibilidadeDaMaiorRemuneracaoNaLiquidacao` — porte 1-a-1
   * de Calculo.java:2019-2029.
   *
   * Se `valorMaiorRemuneracao` esta nulo e existe verba referenciando
   * `MAIOR_REMUNERACAO` (em ValorPago.baseTabelada de FormulaInformada,
   * ou em FormulaCalculada.baseTabelada.tipo) → lanca NegocioException
   * (MSG0030).
   */
  validarDisponibilidadeDaMaiorRemuneracaoNaLiquidacao(): void {
    if (this.valorMaiorRemuneracao != null) return;
    for (const verba of this.verbas) {
      const formula = verba.getFormula();
      if (formula == null) continue;
      // ValorPago.baseTabelada — Java usa `verba.getFormula().getValorPago().getBaseTabelada()`.
      // No port atual ValorPago nao expoe baseTabelada — checamos somente o
      // ramo FormulaCalculada (que e o caminho real para MAIOR_REMUNERACAO).
      if (formula instanceof FormulaCalculada) {
        const tipo = formula.baseTabelada?.tipo;
        if (tipo === BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO) {
          throw new Error('MSG0030: maior remuneracao nao informada');
        }
      }
    }
  }

  /**
   * `validarDisponibilidadeDaUltimaRemuneracaoNaLiquidacao` — porte 1-a-1
   * de Calculo.java:2031-2041 (analogo ao da maior remuneracao, MSG0043).
   */
  validarDisponibilidadeDaUltimaRemuneracaoNaLiquidacao(): void {
    if (this.valorUltimaRemuneracao != null) return;
    for (const verba of this.verbas) {
      const formula = verba.getFormula();
      if (formula == null) continue;
      if (formula instanceof FormulaCalculada) {
        const tipo = formula.baseTabelada?.tipo;
        if (tipo === BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO) {
          throw new Error('MSG0043: ultima remuneracao nao informada');
        }
      }
    }
  }

  /**
   * `validarUsoCorretoDoHistoricoSalarial` — porte 1-a-1 de
   * Calculo.java:2043-2059.
   *
   * Acumula nomes de verbas que usam `HISTORICO_SALARIAL` como base
   * (FormulaCalculada) mas nao tem nenhum historico selecionado em
   * `historicosDaVerbaDoValorDevido`. Se houver, lanca NegocioException
   * (MSG0032) com a lista entre colchetes.
   */
  validarUsoCorretoDoHistoricoSalarial(): void {
    const verbasComErro: string[] = [];
    for (const verba of this.verbas) {
      const formula = verba.getFormula();
      if (!(formula instanceof FormulaCalculada)) continue;
      const baseTabelada = formula.baseTabelada;
      if (baseTabelada == null) continue;
      if (baseTabelada.tipo !== BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL) continue;
      if (verba.getHistoricosDaVerbaDoValorDevido().length > 0) continue;
      verbasComErro.push(verba.getNome());
    }
    if (verbasComErro.length > 0) {
      throw new Error(`MSG0032: [${verbasComErro.join(', ')}]`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                     PREDICADOS (Java 2565-2593)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * `isTemFGTSApurado` — porte 1-a-1 de Calculo.java:2565-2579.
   *
   * Retorna true se QUALQUER uma das condicoes abaixo for verdadeira:
   *   1. fgts.getMulta() == true E fgts.getTipoDoValorDaMulta() == INFORMADA
   *   2. Algum HistoricoSalarial com `aplicarProporcionalidadeFGTS = true`
   *   3. Alguma VerbaAtiva com `incidenciaFGTS = true`
   *
   * O modulo FGTS ainda esta atras de IModuloLiquidavel — narrow defensivo.
   */
  isTemFGTSApurado(): boolean {
    const fgts = this.fgts as null | {
      getMulta?(): boolean;
      getTipoDoValorDaMulta?(): TipoDeBaseDoFgtsEnum | null;
    };
    if (
      fgts?.getMulta?.() === true &&
      fgts?.getTipoDoValorDaMulta?.() === TipoDeBaseDoFgtsEnum.INFORMADA
    ) {
      return true;
    }
    for (const h of this.historicosSalariais) {
      const hist = h as { getAplicarProporcionalidadeFGTS?(): boolean };
      if (hist.getAplicarProporcionalidadeFGTS?.() === true) return true;
    }
    for (const verba of this.getVerbasAtivas()) {
      if (verba.getIncidenciaFGTS()) return true;
    }
    return false;
  }

  /**
   * `isTemMultaInformada` — porte 1-a-1 de Calculo.java:2581-2589.
   *
   * Retorna true se houver alguma multa com `tipoValorDaMulta = INFORMADO`.
   * Multa ainda e Set<unknown> — usa narrow defensivo.
   */
  isTemMultaInformada(): boolean {
    for (const m of this.multas) {
      const multa = m as { getTipoValorDaMulta?(): TipoValorEnum | string | null };
      if (multa.getTipoValorDaMulta?.() === TipoValorEnum.INFORMADO) return true;
    }
    return false;
  }

  /**
   * `isApurarPrevidenciaPrivada` — porte 1-a-1 de Calculo.java:2591-2593.
   *
   * Retorna true se previdenciaPrivada existe (id != null) E
   * `getApurarPrevidenciaPrivada() == true`.
   */
  isApurarPrevidenciaPrivada(): boolean {
    const prev = this.previdenciaPrivada as null | {
      getId?(): number | null;
      getApurarPrevidenciaPrivada?(): boolean;
    };
    if (prev == null) return false;
    if (prev.getId?.() == null) return false;
    return prev.getApurarPrevidenciaPrivada?.() === true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //                  APURACAO INSS POR COMPETENCIA (Java 1977-2010)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * `apurarVerbaIncideInssAvisoOuComum` — porte 1-a-1 de Calculo.java:1977-1986.
   *
   * Acumula a `diferenca` (arredondada) de uma ocorrencia comum/aviso:
   *   1. Soma na ApuracaoDeJuros corrente (`valorVerbaParaContribuicaoSocial`)
   *   2. Acumula no map `competencia → totalParaContribuicaoSocial`
   *
   * O contrato `ApuracaoDeJuros` ainda nao foi portado — usa narrow defensivo
   * via duck-typing nos getters/setters numericos esperados.
   */
  apurarVerbaIncideInssAvisoOuComum(
    mapValorTotalPorCompetenciaParaContribuicaoSocial: Map<unknown, Decimal>,
    ocorrencia: OcorrenciaDeVerba,
    competencia: unknown,
    ocorrenciaDeJuros: unknown,
  ): void {
    const diferenca = arredondarValorMonetario(ocorrencia.getDiferenca());
    const oj = ocorrenciaDeJuros as {
      getValorVerbaParaContribuicaoSocial?(): Decimal | null;
      setValorVerbaParaContribuicaoSocial?(v: Decimal): void;
    };
    const atual = oj.getValorVerbaParaContribuicaoSocial?.() ?? ZERO;
    oj.setValorVerbaParaContribuicaoSocial?.(atual.plus(diferenca));
    const valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocial.get(competencia) ?? ZERO;
    mapValorTotalPorCompetenciaParaContribuicaoSocial.set(competencia, valorCompetencia.plus(diferenca));
  }

  /**
   * `apurarVerbaIncideInssFerias` — porte 1-a-1 de Calculo.java:1988-1999.
   *
   * Para verbas com caracteristica FERIAS, usa `getDiferencaParaCalculoDasIncidencias()`
   * como base (preserva regras de proporcionalidade ferias).
   * Se a base e null, NAO acumula (Java skip).
   */
  apurarVerbaIncideInssFerias(
    mapValorTotalPorCompetenciaParaContribuicaoSocial: Map<unknown, Decimal>,
    ocorrencia: OcorrenciaDeVerba,
    competencia: unknown,
    ocorrenciaDeJuros: unknown,
  ): void {
    const base = ocorrencia.getDiferencaParaCalculoDasIncidencias();
    if (base == null) return;
    const oj = ocorrenciaDeJuros as {
      getValorVerbaParaContribuicaoSocial?(): Decimal | null;
      setValorVerbaParaContribuicaoSocial?(v: Decimal): void;
    };
    const atual = oj.getValorVerbaParaContribuicaoSocial?.() ?? ZERO;
    oj.setValorVerbaParaContribuicaoSocial?.(atual.plus(base));
    const valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocial.get(competencia) ?? ZERO;
    mapValorTotalPorCompetenciaParaContribuicaoSocial.set(competencia, valorCompetencia.plus(base));
  }

  /**
   * `apurarVerbaIncideInssDecimoTerceiro` — porte 1-a-1 de Calculo.java:2001-2010.
   *
   * Acumula `diferenca` (arredondada) de uma ocorrencia de 13o, em map
   * separado (`...DecimoTerceiro`) e em
   * `valorVerbaParaContribuicaoSocialDecimoTerceiro`.
   */
  apurarVerbaIncideInssDecimoTerceiro(
    mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro: Map<unknown, Decimal>,
    ocorrencia: OcorrenciaDeVerba,
    competencia: unknown,
    ocorrenciaDeJuros: unknown,
  ): void {
    const diferenca = arredondarValorMonetario(ocorrencia.getDiferenca());
    const oj = ocorrenciaDeJuros as {
      getValorVerbaParaContribuicaoSocialDecimoTerceiro?(): Decimal | null;
      setValorVerbaParaContribuicaoSocialDecimoTerceiro?(v: Decimal): void;
    };
    const atual = oj.getValorVerbaParaContribuicaoSocialDecimoTerceiro?.() ?? ZERO;
    oj.setValorVerbaParaContribuicaoSocialDecimoTerceiro?.(atual.plus(diferenca));
    const valorCompetencia = mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.get(competencia) ?? ZERO;
    mapValorTotalPorCompetenciaParaContribuicaoSocialDecimoTerceiro.set(
      competencia,
      valorCompetencia.plus(diferenca),
    );
  }
}
