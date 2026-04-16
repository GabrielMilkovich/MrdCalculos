/**
 * Porte 1:1 de ParametrosDeAtualizacao.java (943 linhas).
 *
 * Classe de configuração central da correção/juros do cálculo.
 * Contém ~50 campos cobrindo:
 *   - Correção monetária (índice principal + combinações)
 *   - Juros (tipo + combinações + fase pré-judicial + ente público)
 *   - INSS (correção/juros sobre salários devidos/pagos + Lei 11.941 + multa)
 *   - FGTS (índice de correção + juros com JAM)
 *   - Previdência privada (índice + juros)
 *   - Custas (índice + juros)
 *   - Exceções de juros
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/ParametrosDeAtualizacao.java
 */
import { CombinacaoDeIndice } from './combinacao-de-indice';
import { CombinacaoDeJuros } from './combinacao-de-juros';
import { ExcecaoDeJurosDaAtualizacao } from './excecao-de-juros-da-atualizacao';
import {
  IndiceMonetarioEnum,
  JurosEnum,
  BaseDeJurosDasVerbasEnum,
  IndiceDeCorrecaoDoFGTSEnum,
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoDaMultaDoINSSEnum,
  TipoPagamentoDaMultaDoINSSEnum,
  FormaAplicacaoEnum,
} from '../../../constantes/enums';
import type { Calculo } from '../calculo';

export class ParametrosDeAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;

  // ── Correção monetária ──
  private indiceTrabalhista: IndiceMonetarioEnum = IndiceMonetarioEnum.IPCAE;
  private outroIndiceTrabalhista: IndiceMonetarioEnum | null = null;
  private combinarOutroIndice: boolean = false;
  private apartirDeOutroIndice: Date | null = null;
  private ignorarTaxaNegativa: boolean = false;
  private listaDeCombinacaoDeIndices: Set<CombinacaoDeIndice> = new Set();

  // ── Juros ──
  private juros: JurosEnum = JurosEnum.TRD_SIMPLES;
  private jurosPadrao: boolean | null = null;
  private entePublico: boolean | null = null;
  private apertirDe: Date | null = null;
  private aplicarJurosFasePreJudicial: boolean | null = null;
  private combinarOutroJuros: boolean = false;
  private listaDeCombinacaoDeJuros: Set<CombinacaoDeJuros> = new Set();
  private baseDeJurosDasVerbas: BaseDeJurosDasVerbasEnum = BaseDeJurosDasVerbasEnum.VERBA_INSS;
  private outroJuros: JurosEnum | null = null;
  private apartirDeOutroJuros: Date | null = null;
  private dataInicialDoJurosPadrao: Date | null = null;
  private dataFinalDoJurosPadrao: Date | null = null;
  private dataInicialDoJurosFazendaPublica: Date | null = null;
  private dataFinalDoJurosFazendaPublica: Date | null = null;

  // ── FGTS ──
  private indiceDeCorrecaoDoFGTS: IndiceDeCorrecaoDoFGTSEnum = IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_TRABALHISTA;
  private jurosDeFgtsComJam: boolean = false;

  // ── Previdência Privada ──
  private indiceDeCorrecaoDePrevidenciaPrivada: OpcaoDeIndiceDeCorrecaoEnum = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
  private outroIndiceDeCorrecaoDePrevidenciaPrivada: IndiceMonetarioEnum | null = null;
  private jurosDePrevidenciaPrivada: boolean = false;

  // ── Custas ──
  private indiceDeCorrecaoDasCustas: OpcaoDeIndiceDeCorrecaoEnum = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
  private outroIndiceDeCorrecaoDasCustas: IndiceMonetarioEnum | null = null;
  private jurosDeCustas: boolean = false;
  private correcaoDasCustas: boolean = true;

  // ── INSS — Salários Devidos ──
  private correcaoTrabalhistaDosSalariosDevidosDoINSS: boolean = true;
  private jurosTrabalhistasDosSalariosDevidosDoINSS: boolean = false;
  private aplicarAteDosSalariosDevidosDoINSS: Date | null = null;
  private correcaoPrevidenciariaDosSalariosDevidosDoINSS: boolean = false;
  private jurosPrevidenciariosDosSalariosDevidosDoINSS: boolean = false;
  private aplicarMultaDosSalariosDevidosDoINSS: boolean = false;
  private tipoDeMultaDosSalariosDevidosDoINSS: TipoDaMultaDoINSSEnum = TipoDaMultaDoINSSEnum.URBANA;
  private pagamentoDaMultaDosSalariosDevidosDoINSS: TipoPagamentoDaMultaDoINSSEnum = TipoPagamentoDaMultaDoINSSEnum.INTEGRAL;
  private salarioDevidoFormaAplicacao: FormaAplicacaoEnum | null = null;

  // ── INSS — Salários Pagos ──
  private salarioPagoFormaAplicacao: FormaAplicacaoEnum = FormaAplicacaoEnum.MES_A_MES;
  private correcaoTrabalhistaDosSalariosPagosDoINSS: boolean = false;
  private jurosTrabalhistasDosSalariosPagosDoINSS: boolean = false;
  private aplicarAteDosSalariosPagosDoINSS: Date | null = null;
  private correcaoPrevidenciariaDosSalariosPagosDoINSS: boolean = true;
  private jurosPrevidenciariosDosSalariosPagosDoINSS: boolean = true;
  private aplicarMultaDosSalariosPagosDoINSS: boolean = true;
  private tipoDeMultaDosSalariosPagosDoINSS: TipoDaMultaDoINSSEnum = TipoDaMultaDoINSSEnum.URBANA;
  private pagamentoDaMultaDosSalariosPagosDoINSS: TipoPagamentoDaMultaDoINSSEnum = TipoPagamentoDaMultaDoINSSEnum.INTEGRAL;

  // ── Lei 11.941 ──
  private lei11941: boolean = true;
  private apartirDeLei11941: Date | null = null;
  private apartirDeLei11941Multa: Date | null = null;
  private lei11941Pago: boolean = false;
  private lei11941Multa: boolean = true;
  private apartirDeLei11941Pago: Date | null = null;
  private lei11941PagoMulta: boolean = false;
  private apartirDeLei11941PagoMulta: Date | null = null;

  // ── Exceções de juros ──
  private listaDeExcecaoDeJurosDaAtualizacao: Set<ExcecaoDeJurosDaAtualizacao> = new Set();

  // ── Informativos ──
  private informacaoUltimoIndice: string | null = null;
  private informacaoUltimoIndiceAtualizacao: string | null = null;

  // ── Data de liquidação (usada por TabelaDeCorrecao) ──
  private dataDeLiquidacao: Date | null = null;

  constructor(calculo?: Calculo) {
    if (calculo) {
      this.calculo = calculo;
      const calcExt = calculo as unknown as { isCalculoExterno?: () => boolean };
      const externo = calcExt.isCalculoExterno?.() ?? false;
      if (!externo) {
        this.aplicarJurosFasePreJudicial = true;
        this.combinarOutroJuros = true;
        const juros = new CombinacaoDeJuros();
        const dataAjuiz = (calculo as unknown as { getDataAjuizamento?: () => Date | null }).getDataAjuizamento?.();
        if (dataAjuiz) juros.setApartirDeOutroJuros(dataAjuiz);
        juros.setOutroJuros(JurosEnum.SEM_JUROS);
        juros.setParametrosDeAtualizacao(this);
        this.listaDeCombinacaoDeJuros.add(juros);
      } else {
        this.aplicarJurosFasePreJudicial = false;
        this.juros = JurosEnum.SEM_JUROS;
        this.combinarOutroJuros = false;
      }
    }
  }

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): number | null { return this.id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  // ── Correção ──
  getIndiceTrabalhista(): IndiceMonetarioEnum { return this.indiceTrabalhista; }
  setIndiceTrabalhista(v: IndiceMonetarioEnum): void { this.indiceTrabalhista = v; }
  getOutroIndiceTrabalhista(): IndiceMonetarioEnum | null { return this.outroIndiceTrabalhista; }
  setOutroIndiceTrabalhista(v: IndiceMonetarioEnum | null): void { this.outroIndiceTrabalhista = v; }
  getCombinarOutroIndice(): boolean { return this.combinarOutroIndice; }
  setCombinarOutroIndice(v: boolean): void { this.combinarOutroIndice = v; }
  getApartirDeOutroIndice(): Date | null { return this.apartirDeOutroIndice; }
  setApartirDeOutroIndice(v: Date | null): void { this.apartirDeOutroIndice = v; }
  getIgnorarTaxaNegativa(): boolean { return this.ignorarTaxaNegativa; }
  setIgnorarTaxaNegativa(v: boolean): void { this.ignorarTaxaNegativa = v; }
  getListaDeCombinacaoDeIndices(): Set<CombinacaoDeIndice> { return this.listaDeCombinacaoDeIndices; }
  setListaDeCombinacaoDeIndices(v: Set<CombinacaoDeIndice>): void { this.listaDeCombinacaoDeIndices = v; }
  adicionarCombinacaoDeIndice(c: CombinacaoDeIndice): void { this.listaDeCombinacaoDeIndices.add(c); }

  // ── Juros ──
  getJuros(): JurosEnum { return this.juros; }
  setJuros(v: JurosEnum): void { this.juros = v; }
  getJurosPadrao(): boolean | null { return this.jurosPadrao; }
  setJurosPadrao(v: boolean | null): void { this.jurosPadrao = v; }
  getEntePublico(): boolean | null { return this.entePublico; }
  setEntePublico(v: boolean | null): void { this.entePublico = v; }
  getApertirDe(): Date | null { return this.apertirDe; }
  setApertirDe(v: Date | null): void { this.apertirDe = v; }
  getAplicarJurosFasePreJudicial(): boolean | null { return this.aplicarJurosFasePreJudicial; }
  setAplicarJurosFasePreJudicial(v: boolean | null): void { this.aplicarJurosFasePreJudicial = v; }
  getCombinarOutroJuros(): boolean { return this.combinarOutroJuros; }
  setCombinarOutroJuros(v: boolean): void { this.combinarOutroJuros = v; }
  getListaDeCombinacaoDeJuros(): Set<CombinacaoDeJuros> { return this.listaDeCombinacaoDeJuros; }
  setListaDeCombinacaoDeJuros(v: Set<CombinacaoDeJuros>): void { this.listaDeCombinacaoDeJuros = v; }
  adicionarCombinacaoDeJuros(c: CombinacaoDeJuros): void { this.listaDeCombinacaoDeJuros.add(c); }
  getBaseDeJurosDasVerbas(): BaseDeJurosDasVerbasEnum { return this.baseDeJurosDasVerbas; }
  setBaseDeJurosDasVerbas(v: BaseDeJurosDasVerbasEnum): void { this.baseDeJurosDasVerbas = v; }
  getOutroJuros(): JurosEnum | null { return this.outroJuros; }
  setOutroJuros(v: JurosEnum | null): void { this.outroJuros = v; }
  getApartirDeOutroJuros(): Date | null { return this.apartirDeOutroJuros; }
  setApartirDeOutroJuros(v: Date | null): void { this.apartirDeOutroJuros = v; }
  getDataInicialDoJurosPadrao(): Date | null { return this.dataInicialDoJurosPadrao; }
  setDataInicialDoJurosPadrao(v: Date | null): void { this.dataInicialDoJurosPadrao = v; }
  getDataFinalDoJurosPadrao(): Date | null { return this.dataFinalDoJurosPadrao; }
  setDataFinalDoJurosPadrao(v: Date | null): void { this.dataFinalDoJurosPadrao = v; }
  getDataInicialDoJurosFazendaPublica(): Date | null { return this.dataInicialDoJurosFazendaPublica; }
  setDataInicialDoJurosFazendaPublica(v: Date | null): void { this.dataInicialDoJurosFazendaPublica = v; }
  getDataFinalDoJurosFazendaPublica(): Date | null { return this.dataFinalDoJurosFazendaPublica; }
  setDataFinalDoJurosFazendaPublica(v: Date | null): void { this.dataFinalDoJurosFazendaPublica = v; }

  // ── FGTS ──
  getIndiceDeCorrecaoDoFGTS(): IndiceDeCorrecaoDoFGTSEnum { return this.indiceDeCorrecaoDoFGTS; }
  setIndiceDeCorrecaoDoFGTS(v: IndiceDeCorrecaoDoFGTSEnum): void { this.indiceDeCorrecaoDoFGTS = v; }
  getJurosDeFgtsComJam(): boolean { return this.jurosDeFgtsComJam; }
  setJurosDeFgtsComJam(v: boolean): void { this.jurosDeFgtsComJam = v; }

  // ── Previdência Privada ──
  getIndiceDeCorrecaoDePrevidenciaPrivada(): OpcaoDeIndiceDeCorrecaoEnum { return this.indiceDeCorrecaoDePrevidenciaPrivada; }
  setIndiceDeCorrecaoDePrevidenciaPrivada(v: OpcaoDeIndiceDeCorrecaoEnum): void { this.indiceDeCorrecaoDePrevidenciaPrivada = v; }
  getOutroIndiceDeCorrecaoDePrevidenciaPrivada(): IndiceMonetarioEnum | null { return this.outroIndiceDeCorrecaoDePrevidenciaPrivada; }
  setOutroIndiceDeCorrecaoDePrevidenciaPrivada(v: IndiceMonetarioEnum | null): void { this.outroIndiceDeCorrecaoDePrevidenciaPrivada = v; }
  getJurosDePrevidenciaPrivada(): boolean { return this.jurosDePrevidenciaPrivada; }
  setJurosDePrevidenciaPrivada(v: boolean): void { this.jurosDePrevidenciaPrivada = v; }

  // ── Custas ──
  getIndiceDeCorrecaoDasCustas(): OpcaoDeIndiceDeCorrecaoEnum { return this.indiceDeCorrecaoDasCustas; }
  setIndiceDeCorrecaoDasCustas(v: OpcaoDeIndiceDeCorrecaoEnum): void { this.indiceDeCorrecaoDasCustas = v; }
  getOutroIndiceDeCorrecaoDasCustas(): IndiceMonetarioEnum | null { return this.outroIndiceDeCorrecaoDasCustas; }
  setOutroIndiceDeCorrecaoDasCustas(v: IndiceMonetarioEnum | null): void { this.outroIndiceDeCorrecaoDasCustas = v; }
  getJurosDeCustas(): boolean { return this.jurosDeCustas; }
  setJurosDeCustas(v: boolean): void { this.jurosDeCustas = v; }
  getCorrecaoDasCustas(): boolean { return this.correcaoDasCustas; }
  setCorrecaoDasCustas(v: boolean): void { this.correcaoDasCustas = v; }

  // ── INSS Salários Devidos ──
  getCorrecaoTrabalhistaDosSalariosDevidosDoINSS(): boolean { return this.correcaoTrabalhistaDosSalariosDevidosDoINSS; }
  setCorrecaoTrabalhistaDosSalariosDevidosDoINSS(v: boolean): void { this.correcaoTrabalhistaDosSalariosDevidosDoINSS = v; }
  getJurosTrabalhistasDosSalariosDevidosDoINSS(): boolean { return this.jurosTrabalhistasDosSalariosDevidosDoINSS; }
  setJurosTrabalhistasDosSalariosDevidosDoINSS(v: boolean): void { this.jurosTrabalhistasDosSalariosDevidosDoINSS = v; }
  getAplicarAteDosSalariosDevidosDoINSS(): Date | null { return this.aplicarAteDosSalariosDevidosDoINSS; }
  setAplicarAteDosSalariosDevidosDoINSS(v: Date | null): void { this.aplicarAteDosSalariosDevidosDoINSS = v; }
  getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS(): boolean { return this.correcaoPrevidenciariaDosSalariosDevidosDoINSS; }
  setCorrecaoPrevidenciariaDosSalariosDevidosDoINSS(v: boolean): void { this.correcaoPrevidenciariaDosSalariosDevidosDoINSS = v; }
  getJurosPrevidenciariosDosSalariosDevidosDoINSS(): boolean { return this.jurosPrevidenciariosDosSalariosDevidosDoINSS; }
  setJurosPrevidenciariosDosSalariosDevidosDoINSS(v: boolean): void { this.jurosPrevidenciariosDosSalariosDevidosDoINSS = v; }
  getAplicarMultaDosSalariosDevidosDoINSS(): boolean { return this.aplicarMultaDosSalariosDevidosDoINSS; }
  setAplicarMultaDosSalariosDevidosDoINSS(v: boolean): void { this.aplicarMultaDosSalariosDevidosDoINSS = v; }
  getTipoDeMultaDosSalariosDevidosDoINSS(): TipoDaMultaDoINSSEnum { return this.tipoDeMultaDosSalariosDevidosDoINSS; }
  setTipoDeMultaDosSalariosDevidosDoINSS(v: TipoDaMultaDoINSSEnum): void { this.tipoDeMultaDosSalariosDevidosDoINSS = v; }
  getPagamentoDaMultaDosSalariosDevidosDoINSS(): TipoPagamentoDaMultaDoINSSEnum { return this.pagamentoDaMultaDosSalariosDevidosDoINSS; }
  setPagamentoDaMultaDosSalariosDevidosDoINSS(v: TipoPagamentoDaMultaDoINSSEnum): void { this.pagamentoDaMultaDosSalariosDevidosDoINSS = v; }
  getSalarioDevidoFormaAplicacao(): FormaAplicacaoEnum | null { return this.salarioDevidoFormaAplicacao; }
  setSalarioDevidoFormaAplicacao(v: FormaAplicacaoEnum | null): void { this.salarioDevidoFormaAplicacao = v; }

  // ── INSS Salários Pagos ──
  getSalarioPagoFormaAplicacao(): FormaAplicacaoEnum { return this.salarioPagoFormaAplicacao; }
  setSalarioPagoFormaAplicacao(v: FormaAplicacaoEnum): void { this.salarioPagoFormaAplicacao = v; }
  getCorrecaoTrabalhistaDosSalariosPagosDoINSS(): boolean { return this.correcaoTrabalhistaDosSalariosPagosDoINSS; }
  setCorrecaoTrabalhistaDosSalariosPagosDoINSS(v: boolean): void { this.correcaoTrabalhistaDosSalariosPagosDoINSS = v; }
  getJurosTrabalhistasDosSalariosPagosDoINSS(): boolean { return this.jurosTrabalhistasDosSalariosPagosDoINSS; }
  setJurosTrabalhistasDosSalariosPagosDoINSS(v: boolean): void { this.jurosTrabalhistasDosSalariosPagosDoINSS = v; }
  getAplicarAteDosSalariosPagosDoINSS(): Date | null { return this.aplicarAteDosSalariosPagosDoINSS; }
  setAplicarAteDosSalariosPagosDoINSS(v: Date | null): void { this.aplicarAteDosSalariosPagosDoINSS = v; }
  getCorrecaoPrevidenciariaDosSalariosPagosDoINSS(): boolean { return this.correcaoPrevidenciariaDosSalariosPagosDoINSS; }
  setCorrecaoPrevidenciariaDosSalariosPagosDoINSS(v: boolean): void { this.correcaoPrevidenciariaDosSalariosPagosDoINSS = v; }
  getJurosPrevidenciariosDosSalariosPagosDoINSS(): boolean { return this.jurosPrevidenciariosDosSalariosPagosDoINSS; }
  setJurosPrevidenciariosDosSalariosPagosDoINSS(v: boolean): void { this.jurosPrevidenciariosDosSalariosPagosDoINSS = v; }
  getAplicarMultaDosSalariosPagosDoINSS(): boolean { return this.aplicarMultaDosSalariosPagosDoINSS; }
  setAplicarMultaDosSalariosPagosDoINSS(v: boolean): void { this.aplicarMultaDosSalariosPagosDoINSS = v; }
  getTipoDeMultaDosSalariosPagosDoINSS(): TipoDaMultaDoINSSEnum { return this.tipoDeMultaDosSalariosPagosDoINSS; }
  setTipoDeMultaDosSalariosPagosDoINSS(v: TipoDaMultaDoINSSEnum): void { this.tipoDeMultaDosSalariosPagosDoINSS = v; }
  getPagamentoDaMultaDosSalariosPagosDoINSS(): TipoPagamentoDaMultaDoINSSEnum { return this.pagamentoDaMultaDosSalariosPagosDoINSS; }
  setPagamentoDaMultaDosSalariosPagosDoINSS(v: TipoPagamentoDaMultaDoINSSEnum): void { this.pagamentoDaMultaDosSalariosPagosDoINSS = v; }

  // ── Lei 11.941 ──
  getLei11941(): boolean { return this.lei11941; }
  setLei11941(v: boolean): void { this.lei11941 = v; }
  getApartirDeLei11941(): Date | null { return this.apartirDeLei11941; }
  setApartirDeLei11941(v: Date | null): void { this.apartirDeLei11941 = v; }
  getApartirDeLei11941Multa(): Date | null { return this.apartirDeLei11941Multa; }
  setApartirDeLei11941Multa(v: Date | null): void { this.apartirDeLei11941Multa = v; }
  getLei11941Pago(): boolean { return this.lei11941Pago; }
  setLei11941Pago(v: boolean): void { this.lei11941Pago = v; }
  getLei11941Multa(): boolean { return this.lei11941Multa; }
  setLei11941Multa(v: boolean): void { this.lei11941Multa = v; }
  getApartirDeLei11941Pago(): Date | null { return this.apartirDeLei11941Pago; }
  setApartirDeLei11941Pago(v: Date | null): void { this.apartirDeLei11941Pago = v; }
  getLei11941PagoMulta(): boolean { return this.lei11941PagoMulta; }
  setLei11941PagoMulta(v: boolean): void { this.lei11941PagoMulta = v; }
  getApartirDeLei11941PagoMulta(): Date | null { return this.apartirDeLei11941PagoMulta; }
  setApartirDeLei11941PagoMulta(v: Date | null): void { this.apartirDeLei11941PagoMulta = v; }

  // ── Exceções ──
  getListaDeExcecaoDeJurosDaAtualizacao(): Set<ExcecaoDeJurosDaAtualizacao> { return this.listaDeExcecaoDeJurosDaAtualizacao; }
  setListaDeExcecaoDeJurosDaAtualizacao(v: Set<ExcecaoDeJurosDaAtualizacao>): void { this.listaDeExcecaoDeJurosDaAtualizacao = v; }
  adicionarExcecaoDeJurosDaAtualizacao(e: ExcecaoDeJurosDaAtualizacao): void { this.listaDeExcecaoDeJurosDaAtualizacao.add(e); }

  // ── Informativos ──
  getInformacaoUltimoIndice(): string | null { return this.informacaoUltimoIndice; }
  setInformacaoUltimoIndice(v: string | null): void { this.informacaoUltimoIndice = v; }
  getInformacaoUltimoIndiceAtualizacao(): string | null { return this.informacaoUltimoIndiceAtualizacao; }
  setInformacaoUltimoIndiceAtualizacao(v: string | null): void { this.informacaoUltimoIndiceAtualizacao = v; }

  getDataDeLiquidacao(): Date | null { return this.dataDeLiquidacao; }
  setDataDeLiquidacao(v: Date | null): void { this.dataDeLiquidacao = v; }

  // ────────────── Métodos de lógica ──────────────

  /**
   * isJurosHabilitado (linha 336-338).
   * Retorna true se há juros configurado (não SEM_JUROS) OU se há juros
   * combinado que não seja SEM_JUROS.
   */
  isJurosHabilitado(): boolean {
    if (this.juros !== JurosEnum.SEM_JUROS) return true;
    return this.confirmarQueHaJurosCombinado();
  }

  private confirmarQueHaJurosCombinado(): boolean {
    for (const c of this.listaDeCombinacaoDeJuros) {
      if (c.getOutroJuros() !== JurosEnum.SEM_JUROS) return true;
    }
    return false;
  }

  /**
   * consistirUsoDeOutroIndiceTrabalhista (linha 388-394).
   * Se combinar=false, limpa os campos de combinação.
   */
  consistirUsoDeOutroIndiceTrabalhista(): void {
    if (!this.combinarOutroIndice) {
      this.outroIndiceTrabalhista = null;
      this.apartirDeOutroIndice = null;
      this.listaDeCombinacaoDeIndices = new Set();
    }
  }

  /**
   * consistirUsoDeOutroJuros (linha 396-400).
   * Se combinar=false, limpa lista de combinações.
   */
  consistirUsoDeOutroJuros(): void {
    if (!this.combinarOutroJuros) {
      this.listaDeCombinacaoDeJuros = new Set();
    }
  }

  /**
   * verificarCombinacoesDeCorrecaoMonetaria (linha 402-416).
   *
   * STUB: requer TabelaDeCorrecaoMonetaria.obterTabelaDeIndicesPorPeriodo.
   * Por enquanto, devolve Map vazio (sem inconsistências).
   */
  verificarCombinacoesDeCorrecaoMonetaria(): Map<Date, IndiceMonetarioEnum> {
    return new Map();
  }

  /**
   * verificarCombinacoesDeJuros (linha 418-432).
   * STUB similar ao acima.
   */
  verificarCombinacoesDeJuros(): Map<Date, JurosEnum> {
    return new Map();
  }

  /**
   * obterCombinacaoDeIndicesOrdenada — retorna lista ordenada por data ASC.
   * Usado por máquinas de cálculo que iteram segmentos de correção.
   */
  obterCombinacaoDeIndicesOrdenada(): CombinacaoDeIndice[] {
    return [...this.listaDeCombinacaoDeIndices].sort((a, b) => a.compareTo(b));
  }

  /**
   * obterCombinacaoDeJurosOrdenada — retorna lista ordenada por data ASC.
   */
  obterCombinacaoDeJurosOrdenada(): CombinacaoDeJuros[] {
    return [...this.listaDeCombinacaoDeJuros].sort((a, b) => a.compareTo(b));
  }
}
