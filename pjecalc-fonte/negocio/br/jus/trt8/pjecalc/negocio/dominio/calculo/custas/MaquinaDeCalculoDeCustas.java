/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class MaquinaDeCalculoDeCustas
implements Serializable {
    private static final long serialVersionUID = 356953087394687698L;
    private static final BigDecimal CINCO_POR_CENTO = new BigDecimal(0.05);
    private static final BigDecimal DOIS_POR_CENTO = new BigDecimal(0.02);
    private static final BigDecimal MEIO_POR_CENTO = new BigDecimal(0.005);
    private static final BigDecimal ZERO_VIRGULA_UM_PORCENTO = new BigDecimal(0.001);
    private CustasJudiciais custas;
    private ParametrosDeCustasFixas parametros = null;
    private BigDecimal baseCustasCalculadas = null;

    public MaquinaDeCalculoDeCustas(CustasJudiciais custas) {
        this.custas = custas;
    }

    public void liquidar() {
        Periodo periodoAbrangente;
        BigDecimal custasConhecimento;
        BigDecimal pisoCalculada;
        ParametrosDeCustasFixas parametroCalculada;
        Periodo periodoAbrangente2;
        ParametrosDeCustasFixas parametroInformada;
        Calculo calculo = this.custas.getCalculo();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = null;
        if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
            boolean usaIndiceTrabalhista;
            IndiceMonetarioEnum indiceMonetario = calculo.getAtualizacaoMonetaria();
            boolean bl = usaIndiceTrabalhista = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA == calculo.getParametrosDeAtualizacao().getIndiceDeCorrecaoDasCustas();
            if (!usaIndiceTrabalhista && Utils.naoNulo((Object)calculo.getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDasCustas())) {
                indiceMonetario = calculo.getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDasCustas();
            }
            tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, indiceMonetario, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetaria.marcaInicioFixoMesVencimento();
        }
        switch (this.custas.getTipoDeCustasDeConhecimentoDoReclamante()) {
            case NAO_SE_APLICA: {
                this.custas.setDataVencimentoConhecimentoDoReclamante(null);
                this.custas.setPisoCustasConhecimentoReclamante(null);
                this.custas.setValorDeConhecimentoDoReclamante(null);
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamante(null);
                break;
            }
            case INFORMADA: {
                parametroInformada = null;
                BigDecimal pisoInformada = null;
                if (Utils.naoNulo(this.custas.getDataVencimentoConhecimentoDoReclamante())) {
                    parametroInformada = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoConhecimentoDoReclamante());
                }
                if (Utils.naoNulo(parametroInformada)) {
                    pisoInformada = parametroInformada.getValorPisoCustasConhecimento();
                }
                this.custas.setPisoCustasConhecimentoReclamante(pisoInformada);
                if (Utils.naoNulo(pisoInformada) && this.custas.getValorDeConhecimentoDoReclamante().compareTo(BigDecimal.ZERO) != 0 && this.custas.getValorDeConhecimentoDoReclamante().compareTo(pisoInformada) < 0) {
                    this.custas.setValorDeConhecimentoDoReclamante(pisoInformada);
                }
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                if (Utils.naoNulo(this.custas.getDataVencimentoConhecimentoDoReclamante()) && HelperDate.dateBefore(this.custas.getDataVencimentoConhecimentoDoReclamante(), calculo.getDataDeLiquidacao())) {
                    periodoAbrangente2 = new Periodo();
                    periodoAbrangente2.setInicial(this.custas.getDataVencimentoConhecimentoDoReclamante());
                    periodoAbrangente2.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente2);
                    this.custas.setIndiceCorrecaoCustasConhecimentoReclamante(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.custas.getDataVencimentoConhecimentoDoReclamante()));
                    break;
                }
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamante(BigDecimal.ONE);
                break;
            }
            case CALCULADA_2_POR_CENTO: {
                this.custas.setDataVencimentoConhecimentoDoReclamante(calculo.getDataDeLiquidacao());
                parametroCalculada = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoConhecimentoDoReclamante());
                pisoCalculada = null;
                if (Utils.naoNulo(parametroCalculada)) {
                    pisoCalculada = parametroCalculada.getValorPisoCustasConhecimento();
                }
                this.custas.setPisoCustasConhecimentoReclamante(pisoCalculada);
                custasConhecimento = this.getBaseCustasCalculadas(calculo).multiply(DOIS_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
                if (Utils.naoNulo(pisoCalculada) && custasConhecimento.compareTo(BigDecimal.ZERO) != 0 && custasConhecimento.compareTo(pisoCalculada) < 0) {
                    custasConhecimento = pisoCalculada;
                }
                this.custas.setValorDeConhecimentoDoReclamante(custasConhecimento);
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamante(BigDecimal.ONE);
            }
        }
        switch (this.custas.getTipoDeCustasDeConhecimentoDoReclamado()) {
            case NAO_SE_APLICA: {
                this.custas.setDataVencimentoConhecimentoDoReclamado(null);
                this.custas.setPisoCustasConhecimentoReclamado(null);
                this.custas.setValorConhecimentoDoReclamado(null);
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamado(null);
                break;
            }
            case INFORMADA: {
                parametroInformada = null;
                BigDecimal pisoInformada = null;
                if (Utils.naoNulo(this.custas.getDataVencimentoConhecimentoDoReclamado())) {
                    parametroInformada = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoConhecimentoDoReclamado());
                }
                if (Utils.naoNulo(parametroInformada)) {
                    pisoInformada = parametroInformada.getValorPisoCustasConhecimento();
                }
                this.custas.setPisoCustasConhecimentoReclamado(pisoInformada);
                if (Utils.naoNulo(pisoInformada) && this.custas.getValorConhecimentoDoReclamado().compareTo(BigDecimal.ZERO) != 0 && this.custas.getValorConhecimentoDoReclamado().compareTo(pisoInformada) < 0) {
                    this.custas.setValorConhecimentoDoReclamado(pisoInformada);
                }
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                if (Utils.naoNulo(this.custas.getDataVencimentoConhecimentoDoReclamado()) && HelperDate.dateBefore(this.custas.getDataVencimentoConhecimentoDoReclamado(), calculo.getDataDeLiquidacao())) {
                    periodoAbrangente2 = new Periodo();
                    periodoAbrangente2.setInicial(this.custas.getDataVencimentoConhecimentoDoReclamado());
                    periodoAbrangente2.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente2);
                    this.custas.setIndiceCorrecaoCustasConhecimentoReclamado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.custas.getDataVencimentoConhecimentoDoReclamado()));
                    break;
                }
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamado(BigDecimal.ONE);
                break;
            }
            case CALCULADA_2_POR_CENTO: {
                this.custas.setDataVencimentoConhecimentoDoReclamado(calculo.getDataDeLiquidacao());
                parametroCalculada = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoConhecimentoDoReclamado());
                pisoCalculada = null;
                if (Utils.naoNulo(parametroCalculada)) {
                    pisoCalculada = parametroCalculada.getValorPisoCustasConhecimento();
                }
                this.custas.setPisoCustasConhecimentoReclamado(pisoCalculada);
                custasConhecimento = this.getBaseCustasCalculadas(calculo).multiply(DOIS_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
                if (Utils.naoNulo(pisoCalculada) && custasConhecimento.compareTo(BigDecimal.ZERO) != 0 && custasConhecimento.compareTo(pisoCalculada) < 0) {
                    custasConhecimento = pisoCalculada;
                }
                this.custas.setValorConhecimentoDoReclamado(custasConhecimento);
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                this.custas.setIndiceCorrecaoCustasConhecimentoReclamado(BigDecimal.ONE);
            }
        }
        HelperDate dataLiquidacao = HelperDate.getInstance(calculo.getDataDeLiquidacao());
        HelperDate dataAjuizamento = HelperDate.getInstance(calculo.getDataAjuizamento());
        this.custas.setTetoCustasConhecimentoReclamante(null);
        this.custas.setTetoCustasConhecimentoReclamado(null);
        BigDecimal tetoCustasConhecimento = null;
        if (calculo.isCalculoExterno().booleanValue()) {
            if (calculo.getCustasJudiciais().getAplicarTetoCustasConhecimentoCalcExterno().booleanValue()) {
                tetoCustasConhecimento = CustasJudiciais.calcularValorTetoCustasConhecimento(dataLiquidacao);
            }
        } else if (dataAjuizamento.greaterThenOrEquals(Constantes.DATA_REFORMA_TRABALHISTA)) {
            tetoCustasConhecimento = CustasJudiciais.calcularValorTetoCustasConhecimento(dataLiquidacao);
        }
        if (this.custas.getTipoDeCustasDeConhecimentoDoReclamante() != TipoDeCustasDeConhecimentoEnum.INFORMADA) {
            this.custas.setTetoCustasConhecimentoReclamante(tetoCustasConhecimento);
            this.custas.setValorDeConhecimentoDoReclamante(Utils.aplicarTeto(tetoCustasConhecimento, this.custas.getValorDeConhecimentoDoReclamante()));
        }
        if (this.custas.getTipoDeCustasDeConhecimentoDoReclamado() != TipoDeCustasDeConhecimentoEnum.INFORMADA) {
            this.custas.setTetoCustasConhecimentoReclamado(tetoCustasConhecimento);
            this.custas.setValorConhecimentoDoReclamado(Utils.aplicarTeto(tetoCustasConhecimento, this.custas.getValorConhecimentoDoReclamado()));
        }
        switch (this.custas.getTipoDeCustasDeLiquidacao()) {
            case NAO_SE_APLICA: {
                this.custas.setDataVencimentoCustasDeLiquidacao(null);
                this.custas.setTetoCustasLiquidacao(null);
                this.custas.setValorCustasDeLiquidacao(null);
                this.custas.setIndiceCorrecaoCustasLiquidacao(null);
                break;
            }
            case INFORMADA: {
                ParametrosDeCustasFixas parametroInformada2 = null;
                BigDecimal tetoInformada = null;
                if (Utils.naoNulo(this.custas.getDataVencimentoCustasDeLiquidacao())) {
                    parametroInformada2 = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoCustasDeLiquidacao());
                }
                if (Utils.naoNulo(parametroInformada2)) {
                    tetoInformada = parametroInformada2.getValorTetoCustasLiquidacao();
                }
                this.custas.setTetoCustasLiquidacao(tetoInformada);
                if (Utils.naoNulo(tetoInformada) && this.custas.getValorCustasDeLiquidacao().compareTo(tetoInformada) > 0) {
                    this.custas.setValorCustasDeLiquidacao(tetoInformada);
                }
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                if (Utils.naoNulo(this.custas.getDataVencimentoCustasDeLiquidacao()) && HelperDate.dateBefore(this.custas.getDataVencimentoCustasDeLiquidacao(), calculo.getDataDeLiquidacao())) {
                    periodoAbrangente = new Periodo();
                    periodoAbrangente.setInicial(this.custas.getDataVencimentoCustasDeLiquidacao());
                    periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                    this.custas.setIndiceCorrecaoCustasLiquidacao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.custas.getDataVencimentoCustasDeLiquidacao()));
                    break;
                }
                this.custas.setIndiceCorrecaoCustasLiquidacao(BigDecimal.ONE);
                break;
            }
            case CALCULADA_MEIO_POR_CENTO: {
                this.custas.setDataVencimentoCustasDeLiquidacao(calculo.getDataDeLiquidacao());
                ParametrosDeCustasFixas parametroCalculada2 = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoCustasDeLiquidacao());
                BigDecimal tetoCalculada = null;
                if (Utils.naoNulo(parametroCalculada2)) {
                    tetoCalculada = parametroCalculada2.getValorTetoCustasLiquidacao();
                }
                this.custas.setTetoCustasLiquidacao(tetoCalculada);
                BigDecimal custasLiquidacao = this.getBaseCustasCalculadas(calculo).multiply(MEIO_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
                if (Utils.naoNulo(tetoCalculada) && custasLiquidacao.compareTo(tetoCalculada) > 0) {
                    custasLiquidacao = tetoCalculada;
                }
                this.custas.setValorCustasDeLiquidacao(custasLiquidacao);
                if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) break;
                this.custas.setIndiceCorrecaoCustasLiquidacao(BigDecimal.ONE);
            }
        }
        if (Utils.naoNulo(this.custas.getDataVencimentoCustasFixas())) {
            ParametrosDeCustasFixas parametro;
            if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue() && HelperDate.dateBefore(this.custas.getDataVencimentoCustasFixas(), calculo.getDataDeLiquidacao())) {
                Periodo periodoAbrangente3 = new Periodo();
                periodoAbrangente3.setInicial(this.custas.getDataVencimentoCustasFixas());
                periodoAbrangente3.setFinal(calculo.getDataDeLiquidacao());
                tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente3);
                this.custas.setIndiceCorrecaoCustasFixas(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.custas.getDataVencimentoCustasFixas()));
            }
            if (Utils.naoNulo(parametro = this.getParametrosDeCustasFixas(this.custas.getDataVencimentoCustasFixas()))) {
                this.custas.setValorAtosUrbanos(parametro.getValorAtosUrbanosOficialJustica());
                this.custas.setValorAtosRurais(parametro.getValorAtosRuraisOficialJustica());
                this.custas.setValorAgravoInstrumento(parametro.getValorAgravoDeInstrumento());
                this.custas.setValorAgravoPeticao(parametro.getValorAgravoDePeticao());
                this.custas.setValorImpuganacaoSentenca(parametro.getValorImpugnacaoSentencaDeLiquidacao());
                this.custas.setValorEmbargosArrematacao(parametro.getValorEmbargosAArrematacao());
                this.custas.setValorEmbargosExecucao(parametro.getValorEmbargosAExecucao());
                this.custas.setValorEmbargosTerceiros(parametro.getValorEmbargosDeTerceiros());
                this.custas.setValorRecursoRevista(parametro.getValorRecursoDeRevista());
            }
        }
        for (AutoJudicial auto : this.custas.getAutosJudiciaisDoCalculo()) {
            if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                if (Utils.naoNulo(auto.getDataVencimentoAuto()) && HelperDate.dateBefore(auto.getDataVencimentoAuto(), calculo.getDataDeLiquidacao())) {
                    periodoAbrangente = new Periodo();
                    periodoAbrangente.setInicial(auto.getDataVencimentoAuto());
                    periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                    auto.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(auto.getDataVencimentoAuto()));
                } else {
                    auto.setIndiceCorrecao(BigDecimal.ONE);
                }
            }
            ParametrosDeCustasFixas parametro = null;
            BigDecimal teto = null;
            if (Utils.naoNulo(auto.getDataVencimentoAuto())) {
                parametro = this.getParametrosDeCustasFixas(auto.getDataVencimentoAuto());
            }
            if (Utils.naoNulo(parametro)) {
                teto = parametro.getValorTetoCustasDeAutos();
            }
            auto.setValorTeto(teto);
            BigDecimal custaAuto = auto.getValorAvaliacaoAuto().multiply(CINCO_POR_CENTO, Utils.CONTEXTO_MATEMATICO);
            if (Utils.naoNulo(teto) && custaAuto.compareTo(teto) > 0) {
                custaAuto = teto;
            }
            auto.setValorCustasAuto(custaAuto);
        }
        for (Armazenamento armazenamento : this.custas.getArmazenamentosDoCalculo()) {
            if (calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) {
                if (Utils.naoNulo(armazenamento.getDataTerminoArmazenamento()) && HelperDate.dateBefore(armazenamento.getDataTerminoArmazenamento(), calculo.getDataDeLiquidacao())) {
                    periodoAbrangente = new Periodo();
                    periodoAbrangente.setInicial(armazenamento.getDataTerminoArmazenamento());
                    periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                    armazenamento.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(armazenamento.getDataTerminoArmazenamento()));
                } else {
                    armazenamento.setIndiceCorrecao(BigDecimal.ONE);
                }
            } else {
                armazenamento.setIndiceCorrecao(null);
            }
            Date dataFinal = armazenamento.getDataTerminoArmazenamento();
            if (Utils.nulo(dataFinal)) {
                dataFinal = calculo.getDataDeLiquidacao();
            }
            Periodo periodoArmazenamento = new Periodo();
            periodoArmazenamento.setInicial(armazenamento.getDataInicioArmazenamento());
            periodoArmazenamento.setFinal(dataFinal);
            Integer qtDias = periodoArmazenamento.totalDeDias();
            armazenamento.setQtdeDias(qtDias);
            BigDecimal custaArmazenamento = armazenamento.getValorAvaliacaoArmazenamento().multiply(ZERO_VIRGULA_UM_PORCENTO, Utils.CONTEXTO_MATEMATICO);
            custaArmazenamento = custaArmazenamento.multiply(new BigDecimal(qtDias), Utils.CONTEXTO_MATEMATICO);
            armazenamento.setValorCustasArmazenamento(custaArmazenamento);
        }
        for (CustaPaga custaPaga : this.custas.getCustasPagasDoReclamante()) {
            if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) continue;
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento(), calculo.getDataDeLiquidacao())) {
                periodoAbrangente = new Periodo();
                periodoAbrangente.setInicial(custaPaga.getDataVencimento());
                periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                custaPaga.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(custaPaga.getDataVencimento()));
                continue;
            }
            custaPaga.setIndiceCorrecao(BigDecimal.ONE);
        }
        for (CustaPaga custaPaga : this.custas.getCustasPagasDoReclamado()) {
            if (!calculo.getParametrosDeAtualizacao().getCorrecaoDasCustas().booleanValue()) continue;
            if (Utils.naoNulo(custaPaga.getDataVencimento()) && HelperDate.dateBefore(custaPaga.getDataVencimento(), calculo.getDataDeLiquidacao())) {
                periodoAbrangente = new Periodo();
                periodoAbrangente.setInicial(custaPaga.getDataVencimento());
                periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
                tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
                custaPaga.setIndiceCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(custaPaga.getDataVencimento()));
                continue;
            }
            custaPaga.setIndiceCorrecao(BigDecimal.ONE);
        }
    }

    public CustasJudiciais getCustas() {
        return this.custas;
    }

    public void setCustas(CustasJudiciais custas) {
        this.custas = custas;
    }

    private BigDecimal getBaseCustasCalculadas(Calculo calculo) {
        if (Utils.nulo(this.baseCustasCalculadas)) {
            BigDecimal brutoReclamante = BigDecimal.ZERO;
            BigDecimal outrosDebitosReclamado = BigDecimal.ZERO;
            switch (this.custas.getBaseParaCustasCalculadas()) {
                case BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO: {
                    boolean cobrarInssDoReclamante;
                    boolean apurarInssSegurado = calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado();
                    boolean bl = cobrarInssDoReclamante = apurarInssSegurado && calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante() != false;
                    if (apurarInssSegurado) {
                        outrosDebitosReclamado = calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado();
                    }
                    if (cobrarInssDoReclamante) {
                        outrosDebitosReclamado = Utils.subtrair(outrosDebitosReclamado, Utils.arredondarValorMonetario(calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante()), outrosDebitosReclamado);
                    }
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSegurado(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssEmpresa(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSAT(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssTerceiros(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getFgts().getTotalDaContribuicaoSocial05(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getFgts().getTotalDaMulta10Corrigida(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getPrevidenciaPrivada().getTotalDeJuros(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getValorTotalMultasDoTipoTerceiroReclamado(), outrosDebitosReclamado);
                    outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getValorTotalHonorariosDevidosPeloReclamado(), outrosDebitosReclamado);
                    if (Boolean.TRUE.equals(calculo.getIrpf().getCobrarDoReclamado())) {
                        outrosDebitosReclamado = Utils.somar(outrosDebitosReclamado, calculo.getIrpf().getTotalValorDevido(), outrosDebitosReclamado);
                    }
                }
                case BRUTO_DEVIDO_AO_RECLAMANTE: {
                    brutoReclamante = calculo.calcularBrutoDevidoAoReclamante();
                }
            }
            this.baseCustasCalculadas = brutoReclamante;
            this.baseCustasCalculadas = this.baseCustasCalculadas.add(outrosDebitosReclamado, Utils.CONTEXTO_MATEMATICO);
            this.custas.setValorBaseCustasCalculadas(this.baseCustasCalculadas);
        }
        return this.baseCustasCalculadas;
    }

    private ParametrosDeCustasFixas getParametrosDeCustasFixas(Date dataVencimento) {
        if (Utils.nulo(this.parametros)) {
            this.parametros = ParametrosDeCustasFixas.obterPorData(dataVencimento);
        } else if (!this.parametros.isDataContidaNaVigencia(dataVencimento)) {
            this.parametros = ParametrosDeCustasFixas.obterPorData(dataVencimento);
        }
        return this.parametros;
    }
}

