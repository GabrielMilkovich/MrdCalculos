/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeCustas
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.MaquinaDeCalculoDeCustas
 *
 * Ref Java: pjecalc-fonte/.../calculo/custas/MaquinaDeCalculoDeCustas.java (~389 linhas)
 *
 * Orquestrador do cálculo de custas judiciais. Fluxo:
 *   1) Correção monetária (se flag correcaoDasCustas ativa)
 *   2) Custas de conhecimento — reclamante e reclamado (NAO_SE_APLICA / INFORMADA / CALCULADA_2%)
 *   3) Teto de custas de conhecimento (Reforma Trabalhista 2017 / calc externo)
 *   4) Custas de liquidação (NAO_SE_APLICA / INFORMADA / CALCULADA_0.5%)
 *   5) Custas fixas (atos processuais)
 *   6) Autos judiciais (5% da avaliação, com teto)
 *   7) Armazenamento (0.1% × dias × avaliação)
 *   8) Custas pagas (reclamante + reclamado — correção)
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import { aplicarTeto, naoNulo, nulo } from '../../../base/comum/utils';
import {
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoDeCustasDeConhecimentoEnum,
  TipoDeCustasDeLiquidacaoEnum,
} from '../../../constantes/enums';
import { TabelaDeCorrecaoMonetaria, type ITabelaCorrecaoContext } from '../../verbacalculo/tabela-de-correcao-monetaria';
import { ParametrosDeCustasFixas } from '../../custas/parametros-de-custas-fixas';
import type { Calculo } from '../calculo';
import type { CustasJudiciais } from './custas-judiciais';

const CINCO_POR_CENTO = new Decimal('0.05');
const DOIS_POR_CENTO = new Decimal('0.02');
const MEIO_POR_CENTO = new Decimal('0.005');
const ZERO_VIRGULA_UM_PORCENTO = new Decimal('0.001');
const UM = new Decimal(1);
const ZERO = new Decimal(0);

export class MaquinaDeCalculoDeCustas {
  private custasJudiciais: CustasJudiciais;
  private parametros: ParametrosDeCustasFixas | null = null;
  private baseCustasCalculadas: Decimal | null = null;

  constructor(custasJudiciais: CustasJudiciais) {
    this.custasJudiciais = custasJudiciais;
  }

  getCustasJudiciais(): CustasJudiciais { return this.custasJudiciais; }
  setCustasJudiciais(c: CustasJudiciais): void { this.custasJudiciais = c; }

  /** liquidar (Java linha 39). */
  liquidar(): void {
    const custas = this.custasJudiciais;
    const calculo = custas.getCalculo();
    if (!calculo) return;

    let tabelaDeCorrecaoMonetaria: TabelaDeCorrecaoMonetaria | null = null;
    const params = calculo.getParametrosDeAtualizacao();
    if (params.getCorrecaoDasCustas()) {
      const usaIndiceTrabalhista =
        params.getIndiceDeCorrecaoDasCustas() === OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
      let indiceMonetario = calculo.getAtualizacaoMonetaria();
      if (!usaIndiceTrabalhista && naoNulo(params.getOutroIndiceDeCorrecaoDasCustas())) {
        indiceMonetario = params.getOutroIndiceDeCorrecaoDasCustas()!;
      }
      const ctx = this.buildTabelaContext(calculo);
      tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(
        ctx, indiceMonetario, calculo.getIndicesAcumulados(),
        calculo.getIgnorarTaxaCorrecaoNegativa(), null, usaIndiceTrabalhista,
      );
      tabelaDeCorrecaoMonetaria.setOrigemCalculo(true);
      tabelaDeCorrecaoMonetaria.marcaInicioFixoMesVencimento();
    }

    // ── Conhecimento Reclamante (Java linhas 59-108) ──
    this.liquidarConhecimento(custas, calculo, tabelaDeCorrecaoMonetaria, 'reclamante');

    // ── Conhecimento Reclamado (Java linhas 109-158) ──
    this.liquidarConhecimento(custas, calculo, tabelaDeCorrecaoMonetaria, 'reclamado');

    // ── Teto (Java linhas 159-178) ──
    custas.setTetoCustasConhecimentoReclamante(null);
    custas.setTetoCustasConhecimentoReclamado(null);
    let tetoCustasConhecimento: Decimal | null = null;
    const dataLiq = HelperDate.getInstance(calculo.getDataDeLiquidacao());
    const dataAjuiz = HelperDate.getInstance(calculo.getDataAjuizamento());
    const DATA_REFORMA = new Date(2017, 10, 11);
    if (calculo.getCalculoExterno()) {
      if (custas.getAplicarTetoCustasConhecimentoCalcExterno()) {
        tetoCustasConhecimento = CustasJudiciaisStatic.calcularValorTetoCustasConhecimento(dataLiq);
      }
    } else if (dataAjuiz && dataAjuiz.getDate() >= DATA_REFORMA.getTime() ? false : HelperDate.dateAfterOrEquals(dataAjuiz.getDate(), DATA_REFORMA)) {
      tetoCustasConhecimento = CustasJudiciaisStatic.calcularValorTetoCustasConhecimento(dataLiq);
    }
    if (custas.getTipoDeCustasDeConhecimentoDoReclamante() !== TipoDeCustasDeConhecimentoEnum.INFORMADA) {
      custas.setTetoCustasConhecimentoReclamante(tetoCustasConhecimento);
      const valorAplicado = aplicarTeto(tetoCustasConhecimento, custas.getValorDeConhecimentoDoReclamante());
      custas.setValorDeConhecimentoDoReclamante(valorAplicado as Decimal | null);
    }
    if (custas.getTipoDeCustasDeConhecimentoDoReclamado() !== TipoDeCustasDeConhecimentoEnum.INFORMADA) {
      custas.setTetoCustasConhecimentoReclamado(tetoCustasConhecimento);
      const valorAplicado = aplicarTeto(tetoCustasConhecimento, custas.getValorConhecimentoDoReclamado());
      custas.setValorConhecimentoDoReclamado(valorAplicado as Decimal | null);
    }

    // ── Liquidação (Java linhas 179-228) ──
    this.liquidarLiquidacao(custas, calculo, tabelaDeCorrecaoMonetaria);

    // ── Custas fixas (Java linhas 229-249) ──
    if (naoNulo(custas.getDataVencimentoCustasFixas())) {
      if (params.getCorrecaoDasCustas() && tabelaDeCorrecaoMonetaria && HelperDate.dateBefore(custas.getDataVencimentoCustasFixas()!, calculo.getDataDeLiquidacao())) {
        const periodo = new Periodo(custas.getDataVencimentoCustasFixas()!, calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
        custas.setIndiceCorrecaoCustasFixas(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(custas.getDataVencimentoCustasFixas()!));
      }
      const parametro = this.getParametrosDeCustasFixas(custas.getDataVencimentoCustasFixas()!);
      if (naoNulo(parametro)) {
        custas.setValorAtosUrbanos(parametro!.getValorAtosUrbanosOficialJustica());
        custas.setValorAtosRurais(parametro!.getValorAtosRuraisOficialJustica());
        custas.setValorAgravoInstrumento(parametro!.getValorAgravoDeInstrumento());
        custas.setValorAgravoPeticao(parametro!.getValorAgravoDePeticao());
        custas.setValorImpuganacaoSentenca(parametro!.getValorImpugnacaoSentencaDeLiquidacao());
        custas.setValorEmbargosArrematacao(parametro!.getValorEmbargosAArrematacao());
        custas.setValorEmbargosExecucao(parametro!.getValorEmbargosAExecucao());
        custas.setValorEmbargosTerceiros(parametro!.getValorEmbargosDeTerceiros());
        custas.setValorRecursoRevista(parametro!.getValorRecursoDeRevista());
      }
    }

    // ── Autos judiciais (Java linhas 250-276) ──
    for (const auto of custas.getAutosJudiciaisDoCalculo()) {
      if (params.getCorrecaoDasCustas() && tabelaDeCorrecaoMonetaria) {
        if (naoNulo(auto.getDataVencimentoAuto()) && HelperDate.dateBefore(auto.getDataVencimentoAuto()!, calculo.getDataDeLiquidacao())) {
          const periodo = new Periodo(auto.getDataVencimentoAuto()!, calculo.getDataDeLiquidacao());
          tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
          auto.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(auto.getDataVencimentoAuto()!));
        } else {
          auto.setIndiceCorrecao(UM);
        }
      }
      const parametro = naoNulo(auto.getDataVencimentoAuto()) ? this.getParametrosDeCustasFixas(auto.getDataVencimentoAuto()!) : null;
      const teto = parametro?.getValorTetoCustasDeAutos() ?? null;
      auto.setValorTeto(teto);
      let custaAuto = auto.getValorAvaliacaoAuto().times(CINCO_POR_CENTO);
      if (naoNulo(teto) && custaAuto.greaterThan(teto!)) custaAuto = teto!;
      auto.setValorCustasAuto(custaAuto);
    }

    // ── Armazenamento (Java linhas 277-303) ──
    for (const armazenamento of custas.getArmazenamentosDoCalculo()) {
      if (params.getCorrecaoDasCustas() && tabelaDeCorrecaoMonetaria) {
        if (naoNulo(armazenamento.getDataTerminoArmazenamento()) && HelperDate.dateBefore(armazenamento.getDataTerminoArmazenamento()!, calculo.getDataDeLiquidacao())) {
          const periodo = new Periodo(armazenamento.getDataTerminoArmazenamento()!, calculo.getDataDeLiquidacao());
          tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
          armazenamento.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(armazenamento.getDataTerminoArmazenamento()!));
        } else {
          armazenamento.setIndiceCorrecao(UM);
        }
      } else {
        armazenamento.setIndiceCorrecao(null);
      }
      let dataFinal = armazenamento.getDataTerminoArmazenamento();
      if (nulo(dataFinal)) dataFinal = calculo.getDataDeLiquidacao();
      const periodoArm = new Periodo(armazenamento.getDataInicioArmazenamento()!, dataFinal!);
      const qtDias = periodoArm.totalDeDias();
      armazenamento.setQtdeDias(qtDias);
      const custaArm = armazenamento.getValorAvaliacaoArmazenamento().times(ZERO_VIRGULA_UM_PORCENTO).times(qtDias);
      armazenamento.setValorCustasArmazenamento(custaArm);
    }

    // ── Custas pagas reclamante + reclamado (Java linhas 304-327) ──
    for (const custaPaga of custas.getCustasPagasDoReclamante()) {
      if (!params.getCorrecaoDasCustas() || !tabelaDeCorrecaoMonetaria) continue;
      if (naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento()!, calculo.getDataDeLiquidacao())) {
        const periodo = new Periodo(custaPaga.getDataVencimento()!, calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
        custaPaga.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(custaPaga.getDataVencimento()!));
      } else {
        custaPaga.setIndiceCorrecao(UM);
      }
    }
    for (const custaPaga of custas.getCustasPagasDoReclamado()) {
      if (!params.getCorrecaoDasCustas() || !tabelaDeCorrecaoMonetaria) continue;
      if (naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento()!, calculo.getDataDeLiquidacao())) {
        const periodo = new Periodo(custaPaga.getDataVencimento()!, calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
        custaPaga.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(custaPaga.getDataVencimento()!));
      } else {
        custaPaga.setIndiceCorrecao(UM);
      }
    }
  }

  // ────────── helpers ──────────

  /** Calcula conhecimento para reclamante ou reclamado (Java linhas 59-158). */
  private liquidarConhecimento(
    custas: CustasJudiciais,
    calculo: Calculo,
    tabela: TabelaDeCorrecaoMonetaria | null,
    lado: 'reclamante' | 'reclamado',
  ): void {
    const isReclamante = lado === 'reclamante';
    const tipo = isReclamante
      ? custas.getTipoDeCustasDeConhecimentoDoReclamante()
      : custas.getTipoDeCustasDeConhecimentoDoReclamado();
    const getDataVenc = () => isReclamante ? custas.getDataVencimentoConhecimentoDoReclamante() : custas.getDataVencimentoConhecimentoDoReclamado();
    const setDataVenc = (d: Date | null) => isReclamante ? custas.setDataVencimentoConhecimentoDoReclamante(d) : custas.setDataVencimentoConhecimentoDoReclamado(d);
    const setPiso = (v: Decimal | null) => isReclamante ? custas.setPisoCustasConhecimentoReclamante(v) : custas.setPisoCustasConhecimentoReclamado(v);
    const setValor = (v: Decimal | null) => isReclamante ? custas.setValorDeConhecimentoDoReclamante(v) : custas.setValorConhecimentoDoReclamado(v);
    const getValor = (): Decimal | null => isReclamante ? custas.getValorDeConhecimentoDoReclamante() : custas.getValorConhecimentoDoReclamado();
    const setIndice = (v: Decimal | null) => isReclamante ? custas.setIndiceCorrecaoCustasConhecimentoReclamante(v) : custas.setIndiceCorrecaoCustasConhecimentoReclamado(v);

    switch (tipo) {
      case TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA:
        setDataVenc(null);
        setPiso(null);
        setValor(null);
        setIndice(null);
        break;

      case TipoDeCustasDeConhecimentoEnum.INFORMADA: {
        let piso: Decimal | null = null;
        const dataVenc = getDataVenc();
        if (naoNulo(dataVenc)) {
          const parametro = this.getParametrosDeCustasFixas(dataVenc!);
          if (naoNulo(parametro)) piso = parametro!.getValorPisoCustasConhecimento();
        }
        setPiso(piso);
        const valorAtual = getValor();
        if (naoNulo(piso) && valorAtual && !valorAtual.isZero() && valorAtual.lessThan(piso!)) {
          setValor(piso);
        }
        if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas()) break;
        if (naoNulo(dataVenc) && HelperDate.dateBefore(dataVenc!, calculo.getDataDeLiquidacao())) {
          const periodo = new Periodo(dataVenc!, calculo.getDataDeLiquidacao());
          tabela!.carregarTabela(periodo);
          setIndice(tabela!.obterValorAcumuladoDoIndice(dataVenc!));
        } else {
          setIndice(UM);
        }
        break;
      }

      case TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO: {
        setDataVenc(calculo.getDataDeLiquidacao());
        const parametro = this.getParametrosDeCustasFixas(calculo.getDataDeLiquidacao());
        let piso: Decimal | null = null;
        if (naoNulo(parametro)) piso = parametro!.getValorPisoCustasConhecimento();
        setPiso(piso);
        let custasConhecimento = this.getBaseCustasCalculadas(calculo).times(DOIS_POR_CENTO);
        if (naoNulo(piso) && !custasConhecimento.isZero() && custasConhecimento.lessThan(piso!)) {
          custasConhecimento = piso!;
        }
        setValor(custasConhecimento);
        if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas()) setIndice(UM);
        break;
      }
    }
  }

  /** Calcula custas de liquidação (Java linhas 179-228). */
  private liquidarLiquidacao(
    custas: CustasJudiciais,
    calculo: Calculo,
    tabela: TabelaDeCorrecaoMonetaria | null,
  ): void {
    switch (custas.getTipoDeCustasDeLiquidacao()) {
      case TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA:
        custas.setDataVencimentoCustasDeLiquidacao(null);
        custas.setTetoCustasLiquidacao(null);
        custas.setValorCustasDeLiquidacao(null);
        custas.setIndiceCorrecaoCustasLiquidacao(null);
        break;

      case TipoDeCustasDeLiquidacaoEnum.INFORMADA: {
        let teto: Decimal | null = null;
        const dataVenc = custas.getDataVencimentoCustasDeLiquidacao();
        if (naoNulo(dataVenc)) {
          const parametro = this.getParametrosDeCustasFixas(dataVenc!);
          if (naoNulo(parametro)) teto = parametro!.getValorTetoCustasLiquidacao();
        }
        custas.setTetoCustasLiquidacao(teto);
        const valor = custas.getValorCustasDeLiquidacao();
        if (naoNulo(teto) && valor && valor.greaterThan(teto!)) {
          custas.setValorCustasDeLiquidacao(teto);
        }
        if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas()) break;
        if (naoNulo(dataVenc) && HelperDate.dateBefore(dataVenc!, calculo.getDataDeLiquidacao())) {
          const periodo = new Periodo(dataVenc!, calculo.getDataDeLiquidacao());
          tabela!.carregarTabela(periodo);
          custas.setIndiceCorrecaoCustasLiquidacao(tabela!.obterValorAcumuladoDoIndice(dataVenc!));
        } else {
          custas.setIndiceCorrecaoCustasLiquidacao(UM);
        }
        break;
      }

      case TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO: {
        custas.setDataVencimentoCustasDeLiquidacao(calculo.getDataDeLiquidacao());
        const parametro = this.getParametrosDeCustasFixas(calculo.getDataDeLiquidacao());
        let teto: Decimal | null = null;
        if (naoNulo(parametro)) teto = parametro!.getValorTetoCustasLiquidacao();
        custas.setTetoCustasLiquidacao(teto);
        let custasLiquidacao = this.getBaseCustasCalculadas(calculo).times(MEIO_POR_CENTO);
        if (naoNulo(teto) && custasLiquidacao.greaterThan(teto!)) custasLiquidacao = teto!;
        custas.setValorCustasDeLiquidacao(custasLiquidacao);
        if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas()) custas.setIndiceCorrecaoCustasLiquidacao(UM);
        break;
      }
    }
  }

  /** getBaseCustasCalculadas (Java linha 338). */
  private getBaseCustasCalculadas(calculo: Calculo): Decimal {
    if (nulo(this.baseCustasCalculadas)) {
      // TODO(integracao-futura): implementar ramo BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO
      // que soma INSS (segurado, empresa, SAT, terceiros), FGTS (CS 05, multa 10),
      // prev. privada juros, multas terceiro reclamado, honorários reclamado, IRPF (se cobrar do reclamado).
      const brutoReclamante = calculo.calcularBrutoDevidoAoReclamante();
      this.baseCustasCalculadas = brutoReclamante;
      this.custasJudiciais.setValorBaseCustasCalculadas(this.baseCustasCalculadas);
    }
    return this.baseCustasCalculadas!;
  }

  /** getParametrosDeCustasFixas (Java linha 380). */
  private getParametrosDeCustasFixas(dataVencimento: Date): ParametrosDeCustasFixas | null {
    if (nulo(this.parametros) || !this.parametros!.isDataContidaNaVigencia(dataVencimento)) {
      this.parametros = ParametrosDeCustasFixas.obterPorData(dataVencimento);
    }
    return this.parametros;
  }

  private buildTabelaContext(calculo: Calculo): ITabelaCorrecaoContext {
    const calcRef = calculo as unknown as { getDataDemissao?(): Date };
    return {
      getDataDeLiquidacao: () => calculo.getDataDeLiquidacao(),
      getDataDemissao: () => calcRef.getDataDemissao?.() ?? calculo.getDataDeLiquidacao(),
    };
  }
}

/** Duck-typed static para calcularValorTetoCustasConhecimento (Java CustasJudiciais.java linha 262). */
const CustasJudiciaisStatic = {
  calcularValorTetoCustasConhecimento(dataLiquidacao: HelperDate): Decimal | null {
    // Java: teto_previdenciario_da_data × 4. Stub por ora — não temos tabela de teto INSS portada.
    // Retorna null = sem teto (fallback seguro).
    void dataLiquidacao;
    return null;
  },
};
