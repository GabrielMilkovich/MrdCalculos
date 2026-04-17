/**
 * PJe-Calc v2.15.1 — TabelaDeCorrecaoMonetaria
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/TabelaDeCorrecaoMonetaria.java
 *
 * Classe central de correção monetária. Dado um índice (IPCA-E, SELIC, JAM...)
 * e um regime (MES_SUBSEQUENTE_AO_VENCIMENTO etc.), carrega a tabela de fatores
 * acumulados e devolve o índice aplicável para cada data (`obterIndice(data)`).
 *
 * ## Dependências
 *
 * Em vez de usar `ServicoDeCalculo` (singleton Seam) e `Calculo` (3087 linhas),
 * este port recebe as dependências via interface `ITabelaCorrecaoContext`
 * injetada no construtor. Isso mantém a lógica 1:1 sem arrastar JPA/Seam.
 *
 * ## Escopo portado
 *
 * ✅ Dispatcher completo de `obterTabelaDeIndicesPorPeriodo` (17 índices)
 * ✅ `ajustarData` (Súmula 381 — 4 modos de IndicesAcumuladosEnum)
 * ✅ `tratarMesSubsequenteMesVencimento` + `isVerbaRescisoria`
 * ✅ `carregarTabela` simples (sem combinação)
 * ✅ `obterIndice(data)` com iteração forward quando não há valor no dia
 * ⬜ Combinação de índices (combinarIndiceDiarioComOutroIndice* — 4 métodos)
 *     — marcados como stub; requerem ParametrosDeAtualizacao + CombinacaoDeIndice
 *     portados primeiro.
 * ⬜ ConversaoDeMoedas pré-1995 — apenas placeholders vazios.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { naoNulo, nulo, multiplicar, dividir, somar, subtrair } from '../../base/comum/utils';
import {
  IndiceMonetarioEnum, IndicesAcumuladosEnum, OcorrenciaDePagamentoEnum,
} from '../../constantes/enums';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';
import {
  revisarConversaoInicial, obterTabelaDeIndicesIgnorandoTaxasNegativas,
} from '../../comum/rotinasdecalculo/calculador-de-indices';
import type { ParametrosDeAtualizacao } from '../calculo/atualizacao/parametros-de-atualizacao';
import type { CombinacaoDeIndice } from '../calculo/atualizacao/combinacao-de-indice';
import { ParametrosDeAtualizacaoUtils } from '../calculo/atualizacao/parametros-de-atualizacao-utils';
import { TabelaDeCorrecaoMonetariaUtils } from './tabela-de-correcao-monetaria-utils';
import { MaquinaDeCalculoDeCorrecaoMonetaria } from './maquina-de-calculo-de-correcao-monetaria';

// Índices concretos (todos portados):
import { IndiceSemCorrecao } from '../indices/indice-sem-correcao';
import { IndiceIPCAE } from '../indices/ipcae/indice-ipcae';
import { IndiceIPCA } from '../indices/ipca/indice-ipca';
import { IndiceINPC } from '../indices/inpc/indice-inpc';
import { IndiceIPC } from '../indices/ipc/indice-ipc';
import { IndiceTR } from '../indices/tr/indice-tr';
import { IndiceIGPM } from '../indices/igpm/indice-igpm';
import { IndiceJAM } from '../indices/jam/indice-jam';
import { IndiceSelicDiaria } from '../indices/selic/indice-selic-diaria';
import { IndiceSelicFazenda } from '../indices/selic/indice-selic-fazenda';
import { IndiceIPCAETR } from '../indices/ipcatr/indice-ipcae-tr';
import { IndiceDevedorFazenda } from '../indices/dfp/indice-devedor-fazenda';
import { IndiceIndebitoTributario } from '../indices/it/indice-indebito-tributario';
import { IndiceTabelaUnicaJTMensal } from '../indices/tabelaunica/indice-tabela-unica-jt-mensal';
import { IndiceTabelaUnicaJTDiario } from '../indices/tabelaunica/indice-tabela-unica-jt-diario';
import { IndiceTabelaUnicaDebitoTrabalhista } from '../indices/tabelaunica/indice-tabela-unica-debito-trabalhista';

const MASCARA_DIA = 'ddMMyyyy';
const DIAS_A_MAIS_VENCIMENTO_RESCISORIAS = 10;

/**
 * Interface de contexto injetada no construtor — substitui as dependências
 * Calculo + ServicoDeCalculo + ParametrosDeAtualizacao do Java.
 */
export interface ITabelaCorrecaoContext {
  /** Data de liquidação do cálculo */
  getDataDeLiquidacao(): Date;
  /** Data de demissão (usada em MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO) */
  getDataDemissao(): Date | null;
  /**
   * ParametrosDeAtualizacao do cálculo — necessário para detectar combinações
   * de índice (ADC 58/59). Quando ausente, carregarTabela() opera em modo
   * índice único (compatibilidade retroativa).
   */
  getParametrosDeAtualizacao?(): ParametrosDeAtualizacao | null;
  /**
   * Função de resolução de índices SELIC (JurosSelicParaCorrecao) —
   * requer contexto do cálculo para decidir +1% no mês de liquidação etc.
   * Quando ausente, usa fallback simples baseado em IndiceSelicFazenda.
   */
  obterTabelaSelicParaCorrecao?(
    periodo: Periodo,
    ignorarTaxaNegativa: boolean,
    origemCalculo: boolean | null,
  ): IndiceDeCalculo[];
}

export class TabelaDeCorrecaoMonetaria {
  private competencia: HelperDate = HelperDate.getInstance();
  private tabela: Map<string, Decimal> = new Map();
  private indicesAcumulados: IndicesAcumuladosEnum;
  private ocorrenciaDePagamento: OcorrenciaDePagamentoEnum | null;
  private indice: IndiceMonetarioEnum;
  private ignorarTaxaCorrecaoNegativa: boolean;
  private indiceDiario: boolean;
  private dataFinalDoPeriodo: HelperDate = HelperDate.getInstance();
  private ehMultaFGTS: boolean = false;
  private ehOcorrenciaSeguroDesemprego: boolean = false;
  private isFixoMesVencimento: boolean = false;
  private dataAPartirDeOutroIndice: Date | null = null;
  private outroIndice: IndiceMonetarioEnum | null = null;
  private isIndiceTrabalhista: boolean = true;
  private outroIndiceEhDiario: boolean = false;
  private periodoDaTabelaAtual: Periodo | null = null;
  private origemCalculo: boolean | null = null;
  private dataLiquidacao: Date | null = null;
  private existeIndiceDiarioNaCombinacao: boolean | null = null;
  private parametrosAtualizacao: ParametrosDeAtualizacao | null = null;
  private maquinaDeCalculoDeCorrecaoMonetaria: MaquinaDeCalculoDeCorrecaoMonetaria | null = null;
  private context: ITabelaCorrecaoContext;

  constructor(
    context: ITabelaCorrecaoContext,
    indice: IndiceMonetarioEnum,
    indicesAcumulados: IndicesAcumuladosEnum,
    ignorarTaxaCorrecaoNegativa: boolean,
    ocorrenciaDePagamento: OcorrenciaDePagamentoEnum | null = null,
    isIndiceTrabalhista: boolean = true,
  ) {
    this.context = context;
    this.indice = indice;
    this.indicesAcumulados = indicesAcumulados;
    this.ocorrenciaDePagamento = ocorrenciaDePagamento;
    this.ignorarTaxaCorrecaoNegativa = ignorarTaxaCorrecaoNegativa;
    this.isIndiceTrabalhista = isIndiceTrabalhista;
    this.indiceDiario = this.isIndiceDiario(indice);
  }

  // ────────────── Marcadores (linhas 120-130) ──────────────

  marcaComoMultaFGTS(): void { this.ehMultaFGTS = true; }
  marcaComoCorrecaoSeguroDesemprego(): void { this.ehOcorrenciaSeguroDesemprego = true; }
  marcaInicioFixoMesVencimento(): void { this.isFixoMesVencimento = true; }

  /** excluirCompetencia (linha 132) */
  excluirCompetencia(competencia: HelperDate): void {
    const chave = competencia.format(MASCARA_DIA);
    if (this.tabela.has(chave)) this.tabela.delete(chave);
  }

  // ────────────── Obter índices (linhas 138-207) ──────────────

  /**
   * obterIndicesDeCalculo (linha 138)
   *
   * Público porque a `MaquinaDeCalculoDeCorrecaoMonetaria` precisa consultar
   * a tabela quando resolve combinações encadeadas no mesmo mês.
   */
  obterIndicesDeCalculo(indiceMonetario: IndiceMonetarioEnum, periodo: Periodo): IndiceDeCalculo[] {
    if (nulo(indiceMonetario)) return [];
    let tabelaDeIndices = this.obterTabelaDeIndicesPorPeriodo(indiceMonetario, periodo);
    const dataLiq = this.dataLiquidacao ?? this.context.getDataDeLiquidacao();
    tabelaDeIndices = revisarConversaoInicial(tabelaDeIndices, dataLiq);
    if (this.ignorarTaxaCorrecaoNegativa
        && indiceMonetario !== IndiceMonetarioEnum.SELIC
        && indiceMonetario !== IndiceMonetarioEnum.SELIC_FAZENDA) {
      tabelaDeIndices = obterTabelaDeIndicesIgnorandoTaxasNegativas(tabelaDeIndices);
    }
    return tabelaDeIndices;
  }

  /**
   * obterTabelaDeIndicesPorPeriodo (linha 152)
   *
   * Dispatcher completo por IndiceMonetarioEnum. Porte 1:1 do switch Java.
   */
  obterTabelaDeIndicesPorPeriodo(indiceMonetario: IndiceMonetarioEnum, periodo: Periodo): IndiceDeCalculo[] {
    switch (indiceMonetario) {
      case IndiceMonetarioEnum.SEM_CORRECAO: return IndiceSemCorrecao.obterTabela(periodo);
      case IndiceMonetarioEnum.IGPM:         return IndiceIGPM.obterTabela(periodo);
      case IndiceMonetarioEnum.INPC:         return IndiceINPC.obterTabela(periodo);
      case IndiceMonetarioEnum.IPC:          return IndiceIPC.obterTabela(periodo);
      case IndiceMonetarioEnum.IPCA:         return IndiceIPCA.obterTabela(periodo);
      case IndiceMonetarioEnum.IPCAE:        return IndiceIPCAE.obterTabela(periodo);
      case IndiceMonetarioEnum.TABELA_DEVEDOR_FAZENDA:
        return IndiceDevedorFazenda.obterTabela(periodo);
      case IndiceMonetarioEnum.TABELA_INDEBITO_TRIBUTARIO:
        return IndiceIndebitoTributario.obterTabela(periodo);
      case IndiceMonetarioEnum.IPCAETR:      return IndiceIPCAETR.obterTabela(periodo);
      case IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO:
        return IndiceTabelaUnicaJTDiario.obterTabela(periodo);
      case IndiceMonetarioEnum.TABELA_UNICA_JT_MENSAL:
        return IndiceTabelaUnicaJTMensal.obterTabela(periodo);
      case IndiceMonetarioEnum.TUACDT:
        return IndiceTabelaUnicaDebitoTrabalhista.obterTabela(periodo);
      case IndiceMonetarioEnum.TR:           return IndiceTR.obterTabela(periodo);
      case IndiceMonetarioEnum.JAM:          return IndiceJAM.obterTabela(periodo);
      case IndiceMonetarioEnum.SELIC: {
        // JurosSelicParaCorrecao.obterTabelaParaCorrecao — requer contexto
        // do Calculo para decidir +1% no mês de liquidação.
        if (this.context.obterTabelaSelicParaCorrecao) {
          return this.context.obterTabelaSelicParaCorrecao(
            periodo, this.ignorarTaxaCorrecaoNegativa, this.origemCalculo,
          );
        }
        // Fallback: usa SELIC Fazenda (mesma metodologia, sem o +1% final)
        return IndiceSelicFazenda.obterTabela(periodo);
      }
      case IndiceMonetarioEnum.SELIC_BACEN:   return IndiceSelicDiaria.obterTabela(periodo);
      case IndiceMonetarioEnum.SELIC_FAZENDA: return IndiceSelicFazenda.obterTabela(periodo);
    }
    throw new Error(`Tabela de índices '${indiceMonetario}' não disponível para essa versão`);
  }

  // ────────────── isIndiceDiario (linha 233) ──────────────

  /** Público para uso da MaquinaDeCalculoDeCorrecaoMonetaria. */
  isIndiceDiario(indice: IndiceMonetarioEnum): boolean {
    return indice === IndiceMonetarioEnum.JAM
      || indice === IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO
      || indice === IndiceMonetarioEnum.SELIC_BACEN
      || indice === IndiceMonetarioEnum.TUACDT;
  }

  // ────────────── carregarTabela (linhas Java 237-307) ──────────────

  /**
   * Carrega a tabela de fatores acumulados para o período.
   *
   * Suporta:
   *  - Índice único (sem combinação) — fluxo direto
   *  - Combinação de 1 índice trabalhista com outro (ADC 58/59: IPCA-E → SEM_CORRECAO/SELIC)
   *  - Múltiplas combinações encadeadas (N combinações) — itera `descendingSet`
   *
   * Requer `context.getParametrosDeAtualizacao()` para ler as combinações.
   * Se ausente, degrada para índice único (compatibilidade).
   */
  carregarTabela(periodo: Periodo): void {
    // Early-exit: período atual já cobre o requerido
    if (this.periodoDaTabelaAtual && this.periodoDaTabelaAtual.getFinal()
        && HelperDate.dateEquals(periodo.getFinal(), this.periodoDaTabelaAtual.getFinal())
        && HelperDate.dateAfterOrEquals(periodo.getInicial(), this.periodoDaTabelaAtual.getInicial())) {
      return;
    }
    this.tabela = new Map();
    this.periodoDaTabelaAtual = periodo;

    this.parametrosAtualizacao = this.context.getParametrosDeAtualizacao?.() ?? null;
    let outrosIndices: IndiceDeCalculo[] = [];
    let indices: IndiceDeCalculo[] = [];
    let montarTabelaCombinada = false;

    indices = this.obterIndicesDeCalculo(this.indice, periodo);

    // Caso sem combinação → fluxo direto
    if (!this.isIndiceTrabalhista
        || !this.parametrosAtualizacao
        || !this.parametrosAtualizacao.getCombinarOutroIndice()) {
      this.montarTabela(periodo, indices, outrosIndices, false, []);
      this.dataFinalDoPeriodo.setDate(periodo.getFinal());
      this.maquinaDeCalculoDeCorrecaoMonetaria?.ajustarTabelaSelicFazenda(this.tabela, this.periodoDaTabelaAtual);
      return;
    }

    // ── Combinações ──
    this.outroIndice = this.parametrosAtualizacao.getOutroIndiceTrabalhista();
    this.dataAPartirDeOutroIndice = this.parametrosAtualizacao.getApartirDeOutroIndice();
    const combinacoesDeIndices = ParametrosDeAtualizacaoUtils.montarAsCombinacoesDeIndices(
      this.parametrosAtualizacao, this.periodoDaTabelaAtual.getFinal()
    );
    // Se outroIndice/data não estão no ParametrosDeAtualizacao mas há combinações,
    // usa a primeira combinação como fallback (Java linha 261-264)
    const temOutroExplicito = this.outroIndice !== null && this.dataAPartirDeOutroIndice !== null;
    if (!temOutroExplicito && combinacoesDeIndices.length > 0) {
      this.outroIndice = combinacoesDeIndices[0].getOutroIndiceTrabalhista();
      this.dataAPartirDeOutroIndice = combinacoesDeIndices[0].getApartirDeOutroIndice();
    }
    montarTabelaCombinada = true;

    if (combinacoesDeIndices.length === 1) {
      // Caso mais comum — ADC 58/59: uma única mudança no período
      if (this.dataAPartirDeOutroIndice
          && HelperDate.dateBefore(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate(), this.dataAPartirDeOutroIndice)) {
        this.outroIndiceEhDiario = this.isIndiceDiario(this.outroIndice!);
        outrosIndices = this.obterIndicesDeCalculo(this.outroIndice!, new Periodo(this.dataAPartirDeOutroIndice, periodo.getFinal()));
        indices = this.obterIndicesDeCalculo(
          this.indice,
          new Periodo(periodo.getInicial(), HelperDate.getInstance(this.dataAPartirDeOutroIndice)!.addDay(-1).getDate())
        );
      } else {
        // data da mudança antes ou no início do período → usa apenas outroIndice
        montarTabelaCombinada = false;
        indices = this.obterIndicesDeCalculo(this.outroIndice!, periodo);
      }
      this.montarTabela(periodo, indices, outrosIndices, montarTabelaCombinada, []);
    } else if (combinacoesDeIndices.length > 1) {
      // N combinações — iterar de trás para frente
      let anterior: CombinacaoDeIndice | null = null;
      let numeroCombinacoesParaIgnorar = 0;
      const descending = [...combinacoesDeIndices].sort((a, b) => b.compareTo(a));
      for (const ind of descending) {
        if (numeroCombinacoesParaIgnorar > 0) {
          anterior = ind;
          --numeroCombinacoesParaIgnorar;
          continue;
        }
        // Índice "proximo" = combinação imediatamente anterior (lower)
        const idxThis = combinacoesDeIndices.indexOf(ind);
        let proximo: CombinacaoDeIndice | null = idxThis > 0 ? combinacoesDeIndices[idxThis - 1] : null;
        const combinacoesAdicionaisNoMesmoMes = TabelaDeCorrecaoMonetariaUtils
          .encontrarCombinacoesAdicionaisNoMesmoMes(ind, combinacoesDeIndices);
        numeroCombinacoesParaIgnorar = combinacoesAdicionaisNoMesmoMes.length;
        for (let i = 0; i < numeroCombinacoesParaIgnorar; ++i) {
          const idxProx = proximo ? combinacoesDeIndices.indexOf(proximo) : -1;
          proximo = idxProx > 0 ? combinacoesDeIndices[idxProx - 1] : null;
        }
        this.indice = proximo === null
          ? this.parametrosAtualizacao.getIndiceTrabalhista()
          : proximo.getOutroIndiceTrabalhista()!;
        this.outroIndice = ind.getOutroIndiceTrabalhista();
        this.dataAPartirDeOutroIndice = ind.getApartirDeOutroIndice();
        this.indiceDiario = this.isIndiceDiario(this.indice);
        this.outroIndiceEhDiario = this.isIndiceDiario(this.outroIndice!);
        this.montarTabelaCombinada(outrosIndices, indices, proximo, anterior, periodo, combinacoesAdicionaisNoMesmoMes);
        anterior = ind;
      }
    } else {
      montarTabelaCombinada = false;
      this.montarTabela(periodo, indices, outrosIndices, montarTabelaCombinada, []);
    }

    this.dataFinalDoPeriodo.setDate(periodo.getFinal());
    this.maquinaDeCalculoDeCorrecaoMonetaria?.ajustarTabelaSelicFazenda(this.tabela, this.periodoDaTabelaAtual);
  }

  // ────────────── montarTabelaCombinada (linhas Java 309-335) ──────────────

  /**
   * Resolve os sub-períodos (antes/depois da mudança) e delega para `montarTabela`
   * com os índices já carregados para cada sub-período.
   */
  private montarTabelaCombinada(
    outrosIndices: IndiceDeCalculo[],
    indices: IndiceDeCalculo[],
    proximo: CombinacaoDeIndice | null,
    anterior: CombinacaoDeIndice | null,
    periodo: Periodo,
    combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[]
  ): void {
    const pIndice = new Periodo(
      proximo === null ? periodo.getInicial() : proximo.getApartirDeOutroIndice()!,
      HelperDate.getInstance(this.dataAPartirDeOutroIndice!)!.addDay(-1).getDate()
    );
    const pOutroIndice = new Periodo(
      this.dataAPartirDeOutroIndice!,
      anterior === null ? periodo.getFinal() : HelperDate.getInstance(anterior.getApartirDeOutroIndice()!)!.addDay(-1).getDate()
    );
    if (HelperDate.dateBefore(pIndice.getFinal(), this.periodoDaTabelaAtual!.getInicial())
        || HelperDate.dateAfter(pIndice.getInicial(), this.periodoDaTabelaAtual!.getFinal())) {
      indices = [];
    } else {
      pIndice.setInicial(HelperDate.dateBefore(pIndice.getInicial(), this.periodoDaTabelaAtual!.getInicial())
        ? this.periodoDaTabelaAtual!.getInicial() : pIndice.getInicial());
      pIndice.setFinal(HelperDate.dateAfter(pIndice.getFinal(), this.periodoDaTabelaAtual!.getFinal())
        ? this.periodoDaTabelaAtual!.getFinal() : pIndice.getFinal());
      indices = this.obterIndicesDeCalculo(this.indice, pIndice);
    }
    if (HelperDate.dateBefore(pOutroIndice.getFinal(), this.periodoDaTabelaAtual!.getInicial())
        || HelperDate.dateAfter(pOutroIndice.getInicial(), this.periodoDaTabelaAtual!.getFinal())) {
      outrosIndices = [];
    } else {
      pOutroIndice.setInicial(HelperDate.dateBefore(pOutroIndice.getInicial(), this.periodoDaTabelaAtual!.getInicial())
        ? this.periodoDaTabelaAtual!.getInicial() : pOutroIndice.getInicial());
      pOutroIndice.setFinal(HelperDate.dateAfter(pOutroIndice.getFinal(), this.periodoDaTabelaAtual!.getFinal())
        ? this.periodoDaTabelaAtual!.getFinal() : pOutroIndice.getFinal());
      outrosIndices = this.obterIndicesDeCalculo(this.outroIndice!, pOutroIndice);
    }
    let periodoMontado = new Periodo(pIndice.getInicial(), pOutroIndice.getFinal());
    if (indices.length > 0 && outrosIndices.length === 0) {
      periodoMontado = new Periodo(pIndice.getInicial(), pIndice.getFinal());
    } else if (indices.length === 0 && outrosIndices.length > 0) {
      periodoMontado = new Periodo(pOutroIndice.getInicial(), pOutroIndice.getFinal());
    }
    if (indices.length > 0 || outrosIndices.length > 0) {
      this.montarTabela(periodoMontado, indices, outrosIndices, true, combinacoesAdicionaisNoMesmoMes);
    }
  }

  // ────────────── montarTabela (linhas Java 337-355) ──────────────

  /**
   * Dispatcher entre os 4 combinadores. Popula `this.tabela` diretamente.
   */
  private montarTabela(
    periodo: Periodo,
    indices: IndiceDeCalculo[],
    outrosIndices: IndiceDeCalculo[],
    montarTabelaCombinada: boolean,
    combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[]
  ): void {
    this.maquinaDeCalculoDeCorrecaoMonetaria = new MaquinaDeCalculoDeCorrecaoMonetaria(this);
    if (montarTabelaCombinada) {
      if (this.indiceDiario && !this.outroIndiceEhDiario) {
        this.combinarIndiceDiarioComOutroIndiceNaoDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
      } else if (!this.indiceDiario && this.outroIndiceEhDiario) {
        this.combinarIndiceNaoDiarioComOutroIndiceDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
      } else if (this.indiceDiario) {
        this.combinarIndiceDiarioComOutroIndiceDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
      } else {
        this.combinarIndiceNaoDiarioComOutroIndiceNaoDiario(
          periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes,
          this.maquinaDeCalculoDeCorrecaoMonetaria.verificarSeExisteIndiceDiarioNas(combinacoesAdicionaisNoMesmoMes)
        );
      }
    } else {
      // Índice único — popula direto
      for (const idx of indices) {
        if (!idx) continue;
        const valorAcum = idx.getValorAcumulado();
        if (!valorAcum) continue;
        const chave = HelperDate.getInstance(idx.getCompetencia())!.format(MASCARA_DIA);
        this.tabela.set(chave, valorAcum);
      }
    }
  }

  // ────────────── combinarIndiceNaoDiarioComOutroIndiceNaoDiario (Java 360-443) ──────────────

  /**
   * Combinação de dois índices não-diários (caso ADC 58/59: IPCA-E → SEM_CORRECAO/SELIC).
   *
   * Algoritmo (Java 360-443):
   *  1. Calcula `indiceAcumuladoDepoisDoMesDaMudanca` (via Utils) e
   *     `indiceOutrosIndicesMesMudanca`/`indiceIndicesMesMudanca` (fatores do mês-pivô)
   *  2. Popula tabela com valorAcumulado dos outros índices (pós-mudança)
   *  3. Calcula `acumuladoAPartirDoMesDaMudanca` — pro-rata no mês da mudança
   *  4. Reescala índices pré-mudança por fator = acumulado/indices[0]
   */
  private combinarIndiceNaoDiarioComOutroIndiceNaoDiario(
    periodo: Periodo,
    indices: IndiceDeCalculo[],
    outrosIndices: IndiceDeCalculo[],
    combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[],
    existeIndiceDiarioNasCombinacoesAdicionais: boolean
  ): void {
    let acumuladoAPartirDoMesDaMudanca: Decimal = new Decimal(1);
    const size = outrosIndices.length;
    const competenciaMesDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice!);
    let indiceAcumuladoDepoisDoMesDaMudanca = TabelaDeCorrecaoMonetariaUtils
      .encontrarIndiceAcumuladoAposMudanca(outrosIndices);
    const isIndiceSELIC = this.indice === IndiceMonetarioEnum.SELIC
                       || this.indice === IndiceMonetarioEnum.SELIC_FAZENDA;
    const isOutroIndiceSELIC = this.outroIndice === IndiceMonetarioEnum.SELIC
                            || this.outroIndice === IndiceMonetarioEnum.SELIC_FAZENDA;

    // indiceOutrosIndicesMesMudanca — fator-mês para o OUTRO índice no mês-pivô
    let indiceOutrosIndicesMesMudanca: Decimal = new Decimal(1);
    if (size > 0 && naoNulo(outrosIndices[size - 1]) && isOutroIndiceSELIC) {
      let fatorConversaoDuranteSelic = new Decimal(1);
      if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice!)) {
        // ConversaoDeMoedas — simplificado para casos modernos: fator = 1
        fatorConversaoDuranteSelic = new Decimal(1);
      }
      indiceOutrosIndicesMesMudanca = multiplicar(
        outrosIndices[size - 1].getValorIndice(), fatorConversaoDuranteSelic
      )!;
    } else if (size > 0 && naoNulo(outrosIndices[size - 1])) {
      indiceOutrosIndicesMesMudanca = dividir(
        outrosIndices[size - 1].getValorAcumulado(), indiceAcumuladoDepoisDoMesDaMudanca
      )!;
    } else {
      // outrosIndices vazio — fatorConversao=1 em casos modernos
      indiceOutrosIndicesMesMudanca = new Decimal(1);
    }

    // indiceIndicesMesMudanca — fator do índice principal na primeira competência
    let indiceIndicesMesMudanca: Decimal = new Decimal(1);
    if (indices.length > 0 && naoNulo(indices[0])) {
      indiceIndicesMesMudanca = indices[0].getValorAcumulado();
    }

    // 2. Popula outros índices (pós mudança) na tabela
    for (const idx of outrosIndices) {
      if (!naoNulo(idx)) continue;
      const valorIndice = idx.getValorAcumulado();
      const chave = HelperDate.getInstance(idx.getCompetencia())!.format(MASCARA_DIA);
      if (!this.tabela.has(chave)) {
        this.tabela.set(chave, valorIndice);
      } else {
        // Se já existe, re-extrai indiceAcumuladoDepois do mês seguinte
        const chaveProxMes = HelperDate.getInstance(competenciaMesDaMudanca.getDate())!.addMonth(1).format(MASCARA_DIA);
        const v = this.tabela.get(chaveProxMes);
        if (v) indiceAcumuladoDepoisDoMesDaMudanca = v;
      }
    }

    // 3. Calcula acumuladoAPartirDoMesDaMudanca
    if (existeIndiceDiarioNasCombinacoesAdicionais) {
      const mapa = this.maquinaDeCalculoDeCorrecaoMonetaria!.preencherTabelaDiariaDoMesDasCombinacoes(
        4, periodo, competenciaMesDaMudanca,
        indiceOutrosIndicesMesMudanca, indiceIndicesMesMudanca,
        combinacoesAdicionaisNoMesmoMes, indiceAcumuladoDepoisDoMesDaMudanca
      );
      for (const [k, v] of mapa) this.tabela.set(k, v);
      acumuladoAPartirDoMesDaMudanca = this.tabela.get(
        HelperDate.getInstance(competenciaMesDaMudanca.getDate())!.format(MASCARA_DIA)
      ) ?? new Decimal(1);
    } else {
      const proporcional = this.maquinaDeCalculoDeCorrecaoMonetaria!.encontrarIndiceProporcionalMesMudanca(
        competenciaMesDaMudanca, indiceOutrosIndicesMesMudanca,
        indiceIndicesMesMudanca, combinacoesAdicionaisNoMesmoMes
      );
      if (isOutroIndiceSELIC) {
        // Caminho SELIC — ConversaoDeMoedas simplificada (fator 1) em casos modernos
        const bd3 = indiceAcumuladoDepoisDoMesDaMudanca; // /1
        acumuladoAPartirDoMesDaMudanca = multiplicar(
          somar(proporcional, subtrair(bd3, new Decimal(1))!)!,
          new Decimal(1)
        )!;
      } else {
        acumuladoAPartirDoMesDaMudanca = multiplicar(proporcional, indiceAcumuladoDepoisDoMesDaMudanca)!;
      }
      if (periodo.isPeriodoContemEsta(this.dataAPartirDeOutroIndice!)) {
        this.tabela.set(
          HelperDate.getInstance(competenciaMesDaMudanca.getDate())!.format(MASCARA_DIA),
          acumuladoAPartirDoMesDaMudanca
        );
      }
    }

    // 4. Reescala índices pré-mudança por fator = acumulado / indices[0]
    //    (equivalente ao Java linhas 420-442 — sem fatorConversao SELIC simplificado)
    let fator: Decimal;
    if (isIndiceSELIC) {
      fator = subtrair(acumuladoAPartirDoMesDaMudanca, indiceIndicesMesMudanca)!;
    } else {
      fator = dividir(acumuladoAPartirDoMesDaMudanca, indiceIndicesMesMudanca)!;
    }
    if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice!) && isIndiceSELIC) {
      fator = subtrair(acumuladoAPartirDoMesDaMudanca, new Decimal(1))!;
    } else if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice!)) {
      fator = acumuladoAPartirDoMesDaMudanca;
    }

    for (const idx of indices) {
      if (!naoNulo(idx)) continue;
      let valorIndice: Decimal;
      if (isIndiceSELIC) {
        valorIndice = somar(idx.getValorAcumulado(), fator)!;
      } else {
        valorIndice = idx.getValorAcumulado().times(fator);
      }
      const chave = HelperDate.getInstance(idx.getCompetencia())!.format(MASCARA_DIA);
      if (!this.tabela.has(chave)) this.tabela.set(chave, valorIndice);
    }
  }

  // ────────────── Combiners remanescentes (stubs) ──────────────

  /**
   * combinarIndiceDiarioComOutroIndiceDiario (Java 452-494).
   * Não implementado — caso raro (ex.: JAM → SELIC_BACEN).
   */
  private combinarIndiceDiarioComOutroIndiceDiario(
    _periodo: Periodo, _indices: IndiceDeCalculo[], _outrosIndices: IndiceDeCalculo[],
    _combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[]
  ): void {
    throw new Error(
      'TabelaDeCorrecaoMonetaria.combinarIndiceDiarioComOutroIndiceDiario: combinação diário×diário ainda não portada'
    );
  }

  /**
   * combinarIndiceNaoDiarioComOutroIndiceDiario (Java 496-...).
   * Não implementado.
   */
  private combinarIndiceNaoDiarioComOutroIndiceDiario(
    _periodo: Periodo, _indices: IndiceDeCalculo[], _outrosIndices: IndiceDeCalculo[],
    _combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[]
  ): void {
    throw new Error(
      'TabelaDeCorrecaoMonetaria.combinarIndiceNaoDiarioComOutroIndiceDiario: combinação não-diário×diário ainda não portada'
    );
  }

  /**
   * combinarIndiceDiarioComOutroIndiceNaoDiario (Java).
   * Não implementado.
   */
  private combinarIndiceDiarioComOutroIndiceNaoDiario(
    _periodo: Periodo, _indices: IndiceDeCalculo[], _outrosIndices: IndiceDeCalculo[],
    _combinacoesAdicionaisNoMesmoMes: CombinacaoDeIndice[]
  ): void {
    throw new Error(
      'TabelaDeCorrecaoMonetaria.combinarIndiceDiarioComOutroIndiceNaoDiario: combinação diário×não-diário ainda não portada'
    );
  }

  // ────────────── ajustarData (linha 608) — Súmula 381 ──────────────

  /**
   * ajustarData (linha 608) — retorna a data ajustada conforme o regime.
   *
   * Para JAM, aplica regras específicas de meses de 1986-1991 (ajuste +2/3/4
   * meses ao dia 20 ou 7).
   *
   * Para outros índices:
   * - MES_SUBSEQUENTE_AO_VENCIMENTO: 1º dia do mês seguinte ao vencimento (Súmula 381 TST)
   * - MES_DO_VENCIMENTO: 1º dia do mês do vencimento
   * - MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO: híbrido (verbas rescisórias ficam no mês do vencimento)
   * - ATUALIZACAO_CALCULO: próprio dia + 1
   */
  private ajustarData(data: Date): HelperDate | null {
    // JAM — regras especiais 1986-1991
    if (this.indice === IndiceMonetarioEnum.JAM) {
      if (this.indicesAcumulados === IndicesAcumuladosEnum.ATUALIZACAO_CALCULO) {
        return this.competencia.setDate(data).addDay(1);
      }
      this.competencia.setDate(data).setDay(1);
      const ano = this.competencia.getYear();
      const mes = this.competencia.getMonth() + 1;
      if ((ano < 1989) || (ano === 1989 && mes <= 5)) {
        return this.competencia.addMonth(4).setDay(20);
      }
      if (ano === 1989 && mes <= 7) {
        return this.competencia.addMonth(3).setDay(20);
      }
      if ((ano < 1991) || (ano === 1991 && mes <= 2)) {
        return this.competencia.addMonth(2).setDay(20);
      }
      return this.competencia.addMonth(2).setDay(7);
    }

    if (this.isFixoMesVencimento) {
      return this.competencia.setDate(data).setDay(1);
    }

    const dataDemissao = this.context.getDataDemissao();
    const ehDemissao = naoNulo(dataDemissao) && HelperDate.dateEquals(
      HelperDate.getCurrentCompetence(data).getDate(),
      HelperDate.getCurrentCompetence(dataDemissao!).getDate()
    );

    switch (this.indicesAcumulados) {
      case IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO:
        return this.competencia.setDate(data).setDay(1).addMonth(1).setDay(1);
      case IndicesAcumuladosEnum.MES_DO_VENCIMENTO:
        return this.competencia.setDate(data).setDay(1);
      case IndicesAcumuladosEnum.MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO:
        return this.tratarMesSubsequenteMesVencimento(ehDemissao, data);
      case IndicesAcumuladosEnum.ATUALIZACAO_CALCULO:
        return this.competencia.setDate(data).addDay(1);
    }
    return null;
  }

  /** tratarMesSubsequenteMesVencimento (linha 649) */
  private tratarMesSubsequenteMesVencimento(ehDemissao: boolean, data: Date): HelperDate {
    if (this.isVerbaRescisoria(ehDemissao) && ehDemissao) {
      const dataDemissao = this.context.getDataDemissao()!;
      return this.competencia
        .setDate(HelperDate.getInstance(dataDemissao)!.addDay(DIAS_A_MAIS_VENCIMENTO_RESCISORIAS).getDate())
        .setDay(1);
    }
    if (this.isVerbaRescisoria(ehDemissao)) {
      return this.competencia.setDate(data).setDay(1);
    }
    return this.competencia.setDate(data).setDay(1).addMonth(1).setDay(1);
  }

  /** isVerbaRescisoria (linha 659) */
  private isVerbaRescisoria(ehDemissao: boolean): boolean {
    const ehNaoMensal = this.ocorrenciaDePagamento !== null
      && this.ocorrenciaDePagamento !== OcorrenciaDePagamentoEnum.MENSAL;
    const ehMensalNaDemissao = this.ocorrenciaDePagamento === OcorrenciaDePagamentoEnum.MENSAL && ehDemissao;
    const ehFGTSNaDemissao = this.ehMultaFGTS && ehDemissao;
    return this.ehOcorrenciaSeguroDesemprego || ehFGTSNaDemissao || ehNaoMensal || ehMensalNaDemissao;
  }

  // ────────────── obterIndice (linha 666) — método principal ──────────────

  /**
   * obterIndice (linha 666) — retorna o fator de correção acumulado para uma data.
   *
   * Versão simplificada (sem conversão de moedas pré-1995 e sem combinação):
   * 1. Ajusta data via `ajustarData` (Súmula 381)
   * 2. Busca na tabela por data_ajustada no formato ddMMyyyy
   * 3. Se não encontrar, avança dia a dia (ou mês a mês) até encontrar ou exceder dataFinal
   * 4. Retorna 1 se nada for encontrado
   */
  obterIndice(data: Date): Decimal {
    const dataAjustada = this.ajustarData(data);
    if (nulo(dataAjustada)) return new Decimal(1);

    let valor = this.tabela.get(dataAjustada!.format(MASCARA_DIA)) ?? null;
    while (valor === null && dataAjustada!.lessThen(this.dataFinalDoPeriodo)) {
      if (this.indiceDiario || this.indicesAcumulados === IndicesAcumuladosEnum.ATUALIZACAO_CALCULO) {
        dataAjustada!.addDay(1);
      } else {
        dataAjustada!.addMonth(1);
      }
      valor = this.tabela.get(dataAjustada!.format(MASCARA_DIA)) ?? null;
    }

    return valor ?? new Decimal(1);
  }

  /** obterValorAcumuladoDoIndice (linha 762) — alias de obterIndice */
  obterValorAcumuladoDoIndice(data: Date): Decimal {
    return this.obterIndice(data);
  }

  // ────────────── Getters/setters ──────────────

  setOcorrenciaDePagamento(o: OcorrenciaDePagamentoEnum): void { this.ocorrenciaDePagamento = o; }
  getIndice(): IndiceMonetarioEnum { return this.indice; }
  getDataAPartirDeOutroIndice(): Date | null { return this.dataAPartirDeOutroIndice; }
  getOutroIndice(): IndiceMonetarioEnum | null { return this.outroIndice; }
  setOrigemCalculo(o: boolean): void { this.origemCalculo = o; }
  setDataLiquidacao(d: Date): void { this.dataLiquidacao = d; }
}
