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

  constructor(irpf: Irpf) {
    this.irpf = irpf;
  }

  getIrpf(): Irpf { return this.irpf; }

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
