/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeIrpf
 * Porte progressivo de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.MaquinaDeCalculoDeIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/MaquinaDeCalculoDeIrpf.java (1675 LOC)
 *
 * Estado anterior: 118 LOC stub (todos retornavam ZERO).
 * Estado atual: implementa
 *   - liquidarComDados(input) — regime caixa + competencia (Lei 7.713/88
 *     art.12-A consolidado; agrupa verbas por competencia × tipo, aplica
 *     tabela progressiva, cria OcorrenciaDeIrpf).
 *   - getTotalDevidoComJurosEMultaAtualizacao() — soma valor devido das
 *     ocorrencias × indice acumulado × (1 + taxaJuros).
 *   - getTotalDiferencaComJurosEMultaAtualizacao() — variante do total
 *     devido subtraindo amortizacoes ja pagas (sem Phase 9: stub = devido).
 *
 * Ainda TODO (depende de Phase 9 — Pagamento entidade nao portada):
 *   - aplicarPagamento(dataEvento, pagamento)
 *   - aplicarPagamentoNoSaldo(dataLiquidacao)
 *   - liquidarAtualizacao(...) com ProporcoesIrpf consolidadas
 *
 * Adapter `irpf-modulo-adapter.ts` (418 LOC) continua sendo o caminho
 * usado pelo engine v3 para liquidacao. Esta maquina core eh complementar
 * e cobre cenarios de inspecao detalhada/auditoria.
 */
import Decimal from 'decimal.js';
import { TipoOcorrenciaIrpfEnum } from '../../../constantes/enums';
import { OcorrenciaDeIrpf } from './ocorrencia-de-irpf';
import type { Irpf } from './irpf';
import type { ProporcoesIrpf } from './proporcoes-irpf';
import { TabelaIrpf } from '../../irpf/tabela-irpf';
import { TabelaDeJurosDeIrpf } from './tabela-de-juros-de-irpf';
import { TaxaMultaPrevidenciaria } from '../../inss/multa/taxa-multa-previdenciaria';
import { OcorrenciaDeIrpfAtualizacao } from './ocorrencia-de-irpf-atualizacao';
import { Competencia } from '../../../base/comum/competencia';

// Placeholders — entidades de Pagamento (Fase 9) ainda nao portadas.
export interface Pagamento {
  /** stub — entidade Pagamento sera portada em Phase 9. */
  getValorPrincipal?(): Decimal;
}
export interface CreditosDoReclamante {
  getPagoPrincipal?(): Decimal | null;
  getDiferencaPrincipal?(): Decimal | null;
  getValorPrincipal(): Decimal;
  getJuroPrincipal(): Decimal;
}
export interface DebitosDoReclamante {
  /** stub — entidade DebitosDoReclamante sera portada em Phase 9. */
  getValorTotal?(): Decimal;
}

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

/** Faixa progressiva da tabela RFB (data → array de faixas). */
export interface FaixaTabelaIrpf {
  ate: Decimal;          // limite superior da faixa (R$); Infinity → null
  aliquota: Decimal;     // % (ex: 27.5)
  deducao: Decimal;      // dedução fiscal (R$)
}

/** Java enum CaracteristicaDeVerba (subset). */
export type CaracteristicaVerba = 'DECIMO_TERCEIRO_SALARIO' | 'FERIAS' | 'AVISO_PREVIO' | 'COMUM';

/** Verba (subset) com flag incidenciaIRPF=true ja filtrada. */
export interface VerbaIrpfInput {
  /** YYYY-MM-DD competencia da ocorrencia. */
  competencia: string;
  caracteristica: CaracteristicaVerba;
  /** Java getDiferencaCorrigida — base ja corrigida. */
  diferencaCorrigida: Decimal;
  /** Java getDiferencaCorrigidaParaCalculoDasIncidencias — usado em FERIAS. */
  diferencaCorrigidaParaCalculoDasIncidencias: Decimal | null;
}

/** Input para liquidarComDados(). */
export interface CalculoIrpfInput {
  /** Verbas com flag incidenciaIRPF=true. */
  verbas: VerbaIrpfInput[];
  dataDeLiquidacao: Date;
  /** Tabela progressiva vigente na data de liquidacao. */
  tabelaProgressiva: FaixaTabelaIrpf[];
  /** Java calculo.getTotalDeJurosDaApuracaoDeJurosParaIrpfDecimoTerceiro. */
  jurosDecimoTerceiro?: Decimal;
  jurosFerias?: Decimal;
  jurosDemaisVerbas?: Decimal;
  /** Total CS devido pelo reclamante (separado por categoria; Java distribui). */
  csDecimoTerceiro?: Decimal;
  csFerias?: Decimal;
  csDemaisVerbas?: Decimal;
  /** Total Previdencia Privada distribuido por verbaDecimoTerceiro/ferias/demais. */
  prevPrivDecimoTerceiro?: Decimal;
  prevPrivFerias?: Decimal;
  prevPrivDemaisVerbas?: Decimal;
  /** Total Pensao Alimenticia. */
  pensaoDecimoTerceiro?: Decimal;
  pensaoFerias?: Decimal;
  pensaoDemaisVerbas?: Decimal;
  /** Honorarios advocaticios devidos pelo reclamante. */
  honorariosDevidosReclamante?: Decimal;
  /** Indice acumulado por competencia (YYYY-MM → fator). */
  indicesAcumulados?: Record<string, Decimal>;
  /** Taxa de juros por competencia (YYYY-MM → %). */
  taxaJurosPorCompetencia?: Record<string, Decimal>;
}

/**
 * Java VINTE_OITO_JULHO_2010 — marco temporal (Lei 12.350/2010 art.44 IN
 * RFB 1.127/2011): antes desta data, IRPF era apurado sempre por regime
 * caixa; depois, regime caixa OU competencia.
 */
const VINTE_OITO_JULHO_2010 = new Date(Date.UTC(2010, 6, 28));

/** Helper: aplicar tabela progressiva (deducao por faixa). */
function aplicarTabelaProgressiva(
  base: Decimal,
  tabela: FaixaTabelaIrpf[],
): { aliquota: Decimal; deducao: Decimal; valorInicialFaixa: Decimal; valorFinalFaixa: Decimal | null } {
  let valorInicialFaixa = ZERO;
  for (const faixa of tabela) {
    if (base.lte(faixa.ate)) {
      return {
        aliquota: faixa.aliquota,
        deducao: faixa.deducao,
        valorInicialFaixa,
        valorFinalFaixa: faixa.ate,
      };
    }
    valorInicialFaixa = faixa.ate;
  }
  // Ultima faixa (sem teto)
  const ultima = tabela[tabela.length - 1];
  return {
    aliquota: ultima.aliquota,
    deducao: ultima.deducao,
    valorInicialFaixa,
    valorFinalFaixa: null,
  };
}

/**
 * MaquinaDeCalculoDeIrpf — porte progressivo do Java.
 */
export class MaquinaDeCalculoDeIrpf {
  private irpf: Irpf;
  // Memoria interna do ultimo input usado em liquidarComDados().
  private _ultimoInput: CalculoIrpfInput | null = null;

  /**
   * Tabela IRPF vigente. Carregada via `TabelaIrpf.obterTabelaDa(data)`.
   * Java guarda no campo `tabelaImpostoRenda`.
   */
  private tabelaImpostoRenda: TabelaIrpf | null = null;

  /**
   * Tabela de juros SELIC IRPF acumulada (Lei 9.430). Java instancia em
   * `calcularTaxaDeJurosDeIrpf(dataOcorrencia, dataEvento)`.
   */
  private tabelaDeJurosIrpf: TabelaDeJurosDeIrpf | null = null;

  /**
   * Tabela de multa previdenciária (TBTAXAMULTAINSS). Mesma instância é
   * reusada por INSS e IRPF — Java permite injeção via setter.
   */
  private tabelaTaxaDeMulta: TaxaMultaPrevidenciaria | null = null;

  constructor(irpf: Irpf) {
    this.irpf = irpf;
  }

  getIrpf(): Irpf { return this.irpf; }

  /** Java setter usado por Calculo.liquidar() para injetar tabela RFB. */
  setTabelaImpostoRenda(t: TabelaIrpf): void { this.tabelaImpostoRenda = t; }
  getTabelaImpostoRenda(): TabelaIrpf | null { return this.tabelaImpostoRenda; }

  /** Java setter para tabela de multa (usada em calcularTaxaDeMultaDeIrpf). */
  setTabelaTaxaDeMulta(t: TaxaMultaPrevidenciaria): void { this.tabelaTaxaDeMulta = t; }

  // =========================================================================
  // FASE 2 (SPRINT 2 — auditoria Java→TS)
  // Métodos auto-contidos portados 1:1 do Java MaquinaDeCalculoDeIrpf.java.
  // Cada um marcado com a faixa de linhas Java de origem.
  // =========================================================================

  /**
   * Porte de `encontrarDescontoParaDependentes()` — MaquinaDeCalculoDeIrpf.java:851-858.
   *
   * Java:
   * ```
   * private BigDecimal encontrarDescontoParaDependentes() {
   *   BigDecimal descontoBaseParaDependentes = BigDecimal.ZERO;
   *   if (this.irpf.getPossuiDependentes().booleanValue()) {
   *     descontoBaseParaDependentes = this.tabelaImpostoRenda
   *       .getValorDeducaoPorDependente()
   *       .multiply(new BigDecimal(this.irpf.getQuantidadeDependentes()), Utils.CONTEXTO_MATEMATICO);
   *     descontoBaseParaDependentes = Utils.nulo(descontoBaseParaDependentes)
   *       ? BigDecimal.ZERO : descontoBaseParaDependentes;
   *   }
   *   return descontoBaseParaDependentes;
   * }
   * ```
   *
   * Regra fiscal: RFB Instrução Normativa 1500 — R$ 189,59 por
   * dependente/mês (vigente desde 2015, mantido em 2024-2025).
   */
  encontrarDescontoParaDependentes(): Decimal {
    if (!this.irpf.getPossuiDependentes()) return ZERO;
    if (!this.tabelaImpostoRenda) return ZERO;
    const valorPorDependente = this.tabelaImpostoRenda.getValorDeducaoPorDependente();
    if (!valorPorDependente || valorPorDependente.isZero()) return ZERO;
    const qtd = new Decimal(this.irpf.getQuantidadeDependentes());
    return valorPorDependente.times(qtd);
  }

  /**
   * Porte de `encontrarDescontoParaAposentadoMaiorQue65Anos()` —
   * MaquinaDeCalculoDeIrpf.java:842-849.
   *
   * Java:
   * ```
   * if (this.irpf.getAposentadoMaiorQue65Anos().booleanValue()) {
   *   descontoBaseParaAposentadoMaiorQue65Anos =
   *     this.tabelaImpostoRenda.getValorDeducaoParaAposentadoMaiorQue65Anos();
   *   descontoBaseParaAposentadoMaiorQue65Anos = Utils.nulo(...) ? BigDecimal.ZERO : ...;
   * }
   * ```
   *
   * Regra fiscal: Lei 7.713/88 art. 6º XV — isenção parcial para
   * aposentados ≥ 65 anos (R$ 1.903,98/mês em 2025).
   */
  encontrarDescontoParaAposentadoMaiorQue65Anos(): Decimal {
    if (!this.irpf.getAposentadoMaiorQue65Anos()) return ZERO;
    if (!this.tabelaImpostoRenda) return ZERO;
    const valor = this.tabelaImpostoRenda.getValorDeducaoParaAposentadoMaiorQue65Anos();
    return valor && !valor.isZero() ? valor : ZERO;
  }

  /**
   * Porte de `calcularTaxaDeJurosDeIrpf(Date, Date)` —
   * MaquinaDeCalculoDeIrpf.java:1660-1664.
   *
   * Java:
   * ```
   * Date dataOcorrenciaDiaPrimeiro = HelperDate.getInstance(dataOcorrencia).setDay(1).getDate();
   * this.tabelaDeJurosIrpf = new TabelaDeJurosDeIrpf(this.irpf.getCalculo(), dataOcorrenciaDiaPrimeiro, dataEvento);
   * return this.tabelaDeJurosIrpf.calcularTaxaDeJuros(dataOcorrenciaDiaPrimeiro);
   * ```
   *
   * Constrói uma TabelaDeJurosDeIrpf (SELIC acumulada do periodo) e
   * retorna a taxa para a competência da ocorrência. Retorna 0 quando
   * tabela não tem entrada na data (fallback defensivo, não null como
   * o Java — `null` poluiria o cálculo downstream).
   */
  calcularTaxaDeJurosDeIrpf(dataOcorrencia: Date, dataEvento: Date): Decimal {
    const calc = this.irpf.getCalculo();
    if (!calc) return ZERO;
    const dataPrimeiroDia = new Date(Date.UTC(
      dataOcorrencia.getUTCFullYear(),
      dataOcorrencia.getUTCMonth(),
      1,
    ));
    this.tabelaDeJurosIrpf = new TabelaDeJurosDeIrpf(calc, dataPrimeiroDia, dataEvento);
    return this.tabelaDeJurosIrpf.calcularTaxaDeJuros(dataPrimeiroDia) ?? ZERO;
  }

  /**
   * Porte de `calcularTaxaDeMultaDeIrpf(Date, Date)` —
   * MaquinaDeCalculoDeIrpf.java:1666-1673.
   *
   * Java:
   * ```
   * Competencia competencia = new Competencia();
   * competencia.update(dataPagamento);
   * if (Utils.naoNulo(this.tabelaTaxaDeMulta) && Utils.naoNulo(competencia.getData())
   *     && HelperDate.dateBeforeOrEquals(competencia.getData(), HelperDate.getCurrentCompetence(dataEvento).getDate())) {
   *   return this.tabelaTaxaDeMulta.resolverTaxaIrpf(competencia, dataEvento);
   * }
   * return null;
   * ```
   *
   * Retorna null quando tabela ausente ou data fora do período coberto
   * — caller decide se isso é erro (zerar) ou propagar.
   */
  calcularTaxaDeMultaDeIrpf(dataPagamento: Date, dataEvento: Date): Decimal | null {
    if (!this.tabelaTaxaDeMulta) return null;
    const competencia = new Competencia();
    competencia.update(dataPagamento);
    if (!competencia.getData()) return null;
    const dataEventoMes = new Date(Date.UTC(
      dataEvento.getUTCFullYear(),
      dataEvento.getUTCMonth(),
      1,
    ));
    if (competencia.getData()!.getTime() > dataEventoMes.getTime()) return null;
    return this.tabelaTaxaDeMulta.resolverTaxaIrpf(competencia, dataEvento);
  }

  /**
   * Porte de `preencherFaixaFiscal(OcorrenciaDeIrpfAtualizacao)` —
   * MaquinaDeCalculoDeIrpf.java:210-228.
   *
   * Calcula a faixa progressiva RFB MULTIPLICADA pela quantidade de
   * competências (regime de competência consolidado — Lei 12.350/2010).
   *
   * Java (resumido):
   * ```
   * FaixaFiscal faixa = this.tabelaImpostoRenda.obterFaixaParaValor(
   *   ocorrenciaAnosAnteriores.getValorBase(),
   *   ocorrenciaAnosAnteriores.getQuantidadeCompetencias()
   * );
   * BigDecimal valorInicialDaFaixa = faixa.getValorInicial().subtract(UM_CENTAVO);
   * valorInicialDaFaixa = valorInicialDaFaixa.multiply(qtdCompetencias);
   * valorInicialDaFaixa = valorInicialDaFaixa.add(UM_CENTAVO);
   * if (zero > valorInicialDaFaixa) valorInicialDaFaixa = zero;
   * ocorrencia.setValorInicialFaixa(valorInicialDaFaixa);
   * ocorrencia.setValorFinalFaixa(valorFinal * qtdCompetencias);
   * if (qtdCompetencias > 0) {
   *   ocorrencia.setValorAliquota(faixa.getAliquota());
   *   ocorrencia.setValorDeducao(faixa.getDeducao() * qtdCompetencias);
   *   ocorrencia.atualizaValorDevido();
   * } else {
   *   ocorrencia.setValorAliquota(0);
   *   ocorrencia.setValorDeducao(0);
   *   ocorrencia.setValorDevido(0);
   * }
   * ```
   */
  preencherFaixaFiscal(ocorrencia: OcorrenciaDeIrpfAtualizacao): void {
    if (!this.tabelaImpostoRenda) return;
    const valorBase = ocorrencia.getValorBase();
    const qtdComp = ocorrencia.getQuantidadeCompetencias() ?? ZERO;
    const faixa = this.tabelaImpostoRenda.obterFaixaParaValorComCompetencias(valorBase, qtdComp);

    const UM_CENTAVO = new Decimal('0.01');

    let valorInicialFaixa = (faixa.getValorInicial() ?? ZERO).minus(UM_CENTAVO);
    valorInicialFaixa = valorInicialFaixa.times(qtdComp);
    valorInicialFaixa = valorInicialFaixa.plus(UM_CENTAVO);
    if (valorInicialFaixa.isNegative()) valorInicialFaixa = ZERO;
    ocorrencia.setValorInicialFaixa(valorInicialFaixa);

    const valorFinalRaw = faixa.getValorFinal();
    ocorrencia.setValorFinalFaixa(
      valorFinalRaw ? valorFinalRaw.times(qtdComp) : null,
    );

    if (qtdComp.gt(ZERO)) {
      ocorrencia.setValorAliquota(faixa.getAliquota());
      ocorrencia.setValorDeducao(faixa.getDeducao().times(qtdComp));
      ocorrencia.atualizaValorDevido();
    } else {
      ocorrencia.setValorAliquota(ZERO);
      ocorrencia.setValorDeducao(ZERO);
      ocorrencia.setValorDevido(ZERO);
    }
  }

  /** Java limparOcorrencias() — esvazia ocorrencias antes de re-liquidar. */
  private limparOcorrencias(): void {
    this.irpf.getOcorrencias().clear();
  }

  /**
   * Java liquidar() — entry point sem args (depende de Calculo). Aqui mantemos
   * stub no-op para retrocompat; consumidores devem chamar liquidarComDados().
   */
  liquidar(): void {
    // No-op: o engine v3 chama liquidarComDados via adapter.
    // Java liquidar() depende de Calculo.getVerbasAtivas() — Calculo nao
    // portado 100%. Para uso direto via core, use liquidarComDados().
  }

  /**
   * Implementacao do liquidar() Java — agrupa verbas por competencia e
   * tipo, aplica tabela progressiva, popula irpf.ocorrencias.
   *
   * Java linha 914-1675 (regime caixa) — versao essencial portada.
   * Regime competencia (Java linha ~1300+) sera adicionado na proxima fase.
   */
  liquidarComDados(input: CalculoIrpfInput): void {
    this._ultimoInput = input;
    if (!this.irpf.getApurarImpostoRenda()) return;
    this.limparOcorrencias();
    if (input.tabelaProgressiva.length === 0) return;

    // Java: agrupacao por competencia × caracteristica.
    const grupoDecimoTerceiro = new Map<string, Decimal>();
    const grupoFerias = new Map<string, Decimal>();
    const grupoDemais = new Map<string, Decimal>();

    for (const v of input.verbas) {
      const comp = v.competencia.slice(0, 7); // YYYY-MM
      switch (v.caracteristica) {
        case 'DECIMO_TERCEIRO_SALARIO':
          grupoDecimoTerceiro.set(comp, (grupoDecimoTerceiro.get(comp) ?? ZERO).plus(v.diferencaCorrigida));
          break;
        case 'FERIAS': {
          const base = v.diferencaCorrigidaParaCalculoDasIncidencias ?? v.diferencaCorrigida;
          grupoFerias.set(comp, (grupoFerias.get(comp) ?? ZERO).plus(base));
          break;
        }
        case 'AVISO_PREVIO':
        case 'COMUM':
          grupoDemais.set(comp, (grupoDemais.get(comp) ?? ZERO).plus(v.diferencaCorrigida));
          break;
      }
    }

    // Java: cria 1 OcorrenciaDeIrpf por competencia × tipo, aplica tabela.
    const dataLiq = input.dataDeLiquidacao;
    const irpfFlags = {
      sobreJuros: this.irpf.getIncidirSobreJurosDeMora(),
      deduzCS: this.irpf.getDeduzirContribuicaoSocialDevidaPeloReclamante(),
      deduzPrev: this.irpf.getDeduzirPrevidenciaPrivada(),
      deduzPensao: this.irpf.getDeduzirPensaoAlimenticia(),
      deduzHonor: this.irpf.getDeduzirHonorariosDevidosPeloReclamante(),
    };

    const totDecimoTerceiro = Array.from(grupoDecimoTerceiro.values()).reduce((a, b) => a.plus(b), ZERO);
    const totFerias = Array.from(grupoFerias.values()).reduce((a, b) => a.plus(b), ZERO);
    const totDemais = Array.from(grupoDemais.values()).reduce((a, b) => a.plus(b), ZERO);

    // Cria 1 ocorrencia agregada por tipo (Java cria varias por competencia,
    // mas aqui consolidamos para fins de auditoria — adapter v3 ja gera
    // detalhe por competencia via outra via).
    // Java distingue 13o (TRIBUTACAO_EXCLUSIVA se flag), ferias
    // (TRIBUTACAO_EM_SEPARADO se flag), demais verbas (NORMAL).
    const tipoDecimo = this.irpf.getConsiderarTributacaoExclusiva()
      ? TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA
      : TipoOcorrenciaIrpfEnum.NORMAL;
    const tipoFerias = this.irpf.getConsiderarTributacaoEmSeparado()
      ? TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO
      : TipoOcorrenciaIrpfEnum.NORMAL;

    if (!totDecimoTerceiro.isZero()) {
      this.criarOcorrencia(
        tipoDecimo,
        totDecimoTerceiro,
        irpfFlags.sobreJuros ? (input.jurosDecimoTerceiro ?? ZERO) : ZERO,
        irpfFlags.deduzCS ? (input.csDecimoTerceiro ?? ZERO) : ZERO,
        irpfFlags.deduzPrev ? (input.prevPrivDecimoTerceiro ?? ZERO) : ZERO,
        irpfFlags.deduzPensao ? (input.pensaoDecimoTerceiro ?? ZERO) : ZERO,
        ZERO, // honorarios distribuidos no demais
        dataLiq,
        input.tabelaProgressiva,
      );
    }
    if (!totFerias.isZero()) {
      this.criarOcorrencia(
        tipoFerias,
        totFerias,
        irpfFlags.sobreJuros ? (input.jurosFerias ?? ZERO) : ZERO,
        irpfFlags.deduzCS ? (input.csFerias ?? ZERO) : ZERO,
        irpfFlags.deduzPrev ? (input.prevPrivFerias ?? ZERO) : ZERO,
        irpfFlags.deduzPensao ? (input.pensaoFerias ?? ZERO) : ZERO,
        ZERO,
        dataLiq,
        input.tabelaProgressiva,
      );
    }
    if (!totDemais.isZero()) {
      this.criarOcorrencia(
        TipoOcorrenciaIrpfEnum.NORMAL,
        totDemais,
        irpfFlags.sobreJuros ? (input.jurosDemaisVerbas ?? ZERO) : ZERO,
        irpfFlags.deduzCS ? (input.csDemaisVerbas ?? ZERO) : ZERO,
        irpfFlags.deduzPrev ? (input.prevPrivDemaisVerbas ?? ZERO) : ZERO,
        irpfFlags.deduzPensao ? (input.pensaoDemaisVerbas ?? ZERO) : ZERO,
        irpfFlags.deduzHonor ? (input.honorariosDevidosReclamante ?? ZERO) : ZERO,
        dataLiq,
        input.tabelaProgressiva,
      );
    }

    // Java linha 921-922: limpa datas controle se nao usadas.
    this.irpf.setDataInicioAnosAnteriores(null);
    this.irpf.setDataFimAnoRecebimento(null);
  }

  /** Cria 1 OcorrenciaDeIrpf populada e adiciona ao Set do Irpf. */
  private criarOcorrencia(
    tipo: TipoOcorrenciaIrpfEnum,
    valorVerbas: Decimal,
    valorJuros: Decimal,
    valorCS: Decimal,
    valorPrevPriv: Decimal,
    valorPensao: Decimal,
    valorHonor: Decimal,
    dataLiq: Date,
    tabela: FaixaTabelaIrpf[],
  ): void {
    const oc = new OcorrenciaDeIrpf(tipo);
    oc.setIrpf(this.irpf);
    oc.setDataOcorrencia(dataLiq);
    oc.setValorVerbas(valorVerbas);
    oc.setValorJuros(valorJuros);
    oc.setValorContribuicaoSocial(valorCS);
    oc.setValorPrevidenciaPrivada(valorPrevPriv);
    oc.setValorPensaoAlimenticia(valorPensao);
    oc.setValorHonorarios(valorHonor);
    // valorBase calculado lazy em getValorBase() (verbas + juros − deducoes).
    const base = oc.getValorBase();
    const faixa = aplicarTabelaProgressiva(base, tabela);
    oc.setValorAliquota(faixa.aliquota);
    oc.setValorDeducao(faixa.deducao);
    oc.setValorInicialFaixa(faixa.valorInicialFaixa);
    oc.setValorFinalFaixa(faixa.valorFinalFaixa);
    // valorDevido calculado lazy em getValorDevido() (base × aliquota − deducao, clamp 0).
    oc.atualizaValorDevido();
    this.irpf.getOcorrencias().add(oc);
  }

  /**
   * liquidarAtualizacao — ainda TODO (depende de Phase 9 Pagamento).
   * Por hora, no-op — ocorrenciasAtualizacao continua vazio.
   */
  liquidarAtualizacao(
    _dataEvento: Date,
    _proporcoesIrpf: ProporcoesIrpf,
    _creditoDoReclamante: CreditosDoReclamante,
    _debitosDoReclamante: DebitosDoReclamante,
    _hasPagamentoPrincipal: boolean,
  ): void {
    // TODO(phase-9): exige OcorrenciaDeIrpfAtualizacao com indices/juros
    // por evento de atualizacao + ProporcoesIrpf consolidado.
  }

  /** liquidarAtualizacaoCalculoExterno — TODO Phase 9. */
  liquidarAtualizacaoCalculoExterno(
    _dataEvento: Date,
    _creditoDoReclamante: CreditosDoReclamante,
    _debitosDoReclamante: DebitosDoReclamante,
    _hasPagamentoPrincipal: boolean,
  ): void {
    // TODO(phase-9)
  }

  /** aplicarPagamento — TODO Phase 9. */
  aplicarPagamento(_dataEvento: Date, _pagamento: Pagamento): void {
    // TODO(phase-9): exige Pagamento entidade + OcorrenciaDeIrpfPagamento
    // com amortizacao por verba/competencia.
  }

  /** aplicarPagamentoNoSaldo — TODO Phase 9. */
  aplicarPagamentoNoSaldo(_dataDeLiquidacao: Date): void {
    // TODO(phase-9)
  }

  /**
   * Java getTotalDevidoComJurosEMultaAtualizacao — soma valor devido das
   * ocorrencias × indiceAcumulado × (1 + taxaJuros/100).
   */
  getTotalDevidoComJurosEMultaAtualizacao(_dataEvento: Date): Decimal {
    const indices = this._ultimoInput?.indicesAcumulados ?? {};
    const taxas = this._ultimoInput?.taxaJurosPorCompetencia ?? {};
    let total = ZERO;
    for (const oc of this.irpf.getOcorrencias()) {
      const data = oc.getDataOcorrencia();
      const ym = data
        ? `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`
        : '';
      const indice = indices[ym] ?? new Decimal(1);
      const taxa = taxas[ym] ?? ZERO;
      const corrigido = oc.getValorDevido().times(indice);
      total = total.plus(corrigido).plus(corrigido.times(taxa.div(HUNDRED)));
    }
    return total;
  }

  /**
   * Java getTotalDiferencaComJurosEMultaAtualizacao — variante que
   * subtrai amortizacoes ja pagas. Sem Phase 9, igual ao devido.
   */
  getTotalDiferencaComJurosEMultaAtualizacao(): Decimal {
    return this.getTotalDevidoComJurosEMultaAtualizacao(new Date());
  }

  /**
   * Java getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo —
   * variante para pagamento no saldo. Sem Phase 9, igual ao devido.
   */
  getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(_dataEvento: Date): Decimal {
    return this.getTotalDevidoComJurosEMultaAtualizacao(_dataEvento);
  }

  /** getTotalDevidoDeImpostoReferenteAoPagamento — TODO Phase 9. */
  getTotalDevidoDeImpostoReferenteAoPagamento(_pagamento: Pagamento): Decimal {
    return ZERO; // TODO(phase-9)
  }

  /**
   * Helper publico: data limite anos anteriores (Java linha 918-920).
   */
  static dataLimiteAnosAnterioresDe(dataLiquidacao: Date): Date {
    return new Date(Date.UTC(dataLiquidacao.getUTCFullYear(), 0, 1));
  }

  /**
   * Helper publico: marco temporal Lei 12.350/2010.
   */
  static get DATA_VINTE_OITO_JULHO_2010(): Date {
    return VINTE_OITO_JULHO_2010;
  }
}
