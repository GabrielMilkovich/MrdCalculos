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
import { naoNulo, nulo } from '../../base/comum/utils';
import {
  IndiceMonetarioEnum, IndicesAcumuladosEnum, OcorrenciaDePagamentoEnum,
} from '../../constantes/enums';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';
import {
  revisarConversaoInicial, obterTabelaDeIndicesIgnorandoTaxasNegativas,
} from '../../comum/rotinasdecalculo/calculador-de-indices';

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

  /** obterIndicesDeCalculo (linha 138) — usado internamente */
  protected obterIndicesDeCalculo(indiceMonetario: IndiceMonetarioEnum, periodo: Periodo): IndiceDeCalculo[] {
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

  protected isIndiceDiario(indice: IndiceMonetarioEnum): boolean {
    return indice === IndiceMonetarioEnum.JAM
      || indice === IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO
      || indice === IndiceMonetarioEnum.SELIC_BACEN
      || indice === IndiceMonetarioEnum.TUACDT;
  }

  // ────────────── carregarTabela (linha 237) ──────────────

  /**
   * Carrega a tabela de fatores acumulados para o período.
   * Versão simplificada (sem combinação — combinação de índices trabalhistas
   * é a parte mais complexa da classe e requer ParametrosDeAtualizacao portada).
   */
  carregarTabela(periodo: Periodo): void {
    // Se período atual já cobre o requerido, não recarrega
    if (this.periodoDaTabelaAtual && this.periodoDaTabelaAtual.getFinal()
        && HelperDate.dateEquals(periodo.getFinal(), this.periodoDaTabelaAtual.getFinal())
        && HelperDate.dateAfterOrEquals(periodo.getInicial(), this.periodoDaTabelaAtual.getInicial())) {
      return;
    }
    this.tabela = new Map();
    this.periodoDaTabelaAtual = periodo;

    const indices = this.obterIndicesDeCalculo(this.indice, periodo);
    // Popula a tabela com valorAcumulado por competência (formato MASCARA_DIA)
    for (const idx of indices) {
      if (!idx) continue;
      const valorAcum = idx.getValorAcumulado();
      if (!valorAcum) continue;
      const chave = HelperDate.getInstance(idx.getCompetencia())!.format(MASCARA_DIA);
      this.tabela.set(chave, valorAcum);
    }
    this.dataFinalDoPeriodo.setDate(periodo.getFinal());
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
