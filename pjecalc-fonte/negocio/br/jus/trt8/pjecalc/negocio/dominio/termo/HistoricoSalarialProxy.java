/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.List;

public class HistoricoSalarialProxy
implements Termo {
    private static final long serialVersionUID = -6358969995991506504L;
    private static final BigDecimal TRINTA_DIAS = new BigDecimal("30");
    private static final int TRINTA_UM_DIAS = 31;
    private ParametroDoTermo parametroDoTermo = null;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        this.parametroDoTermo = parametro;
        VerbaDeCalculo verbaDeCalculo = parametro.getVerbaDeCalculo();
        FaseDoCalculoEnum fase = parametro.getFase();
        if (parametro.getPeriodo().isDatasDoMesmoMes()) {
            if (Utils.naoNulo((Object)fase) && fase == FaseDoCalculoEnum.CALCULANDO_VALOR_PAGO) {
                return this.obterValorTotalDasBasesNoMesmoMes(verbaDeCalculo.getHistoricosDaVerbaDoValorPago(), parametro.getPeriodo(), parametro.getPeriodoParaMedia());
            }
            return this.obterValorTotalDasBasesNoMesmoMes(verbaDeCalculo.getHistoricosDaVerbaDoValorDevido(), parametro.getPeriodo(), parametro.getPeriodoParaMedia());
        }
        if (Utils.naoNulo((Object)fase) && fase == FaseDoCalculoEnum.CALCULANDO_VALOR_PAGO) {
            return this.obterValorTotalDasBasesEmMesesDiferentes(verbaDeCalculo.getHistoricosDaVerbaDoValorPago(), parametro.getPeriodo(), parametro.getPeriodoParaMedia());
        }
        return this.obterValorTotalDasBasesEmMesesDiferentes(verbaDeCalculo.getHistoricosDaVerbaDoValorDevido(), parametro.getPeriodo(), parametro.getPeriodoParaMedia());
    }

    private BigDecimal obterValorTotalDasBasesNoMesmoMes(List<HistoricoSalarialDaVerba> historicosDaVerba, Periodo periodo, Periodo periodoParaMedia) {
        BigDecimal valorTotalIntegral = null;
        BigDecimal valorTotal = BigDecimal.ZERO;
        BigDecimal valorMedia = BigDecimal.ZERO;
        HelperDate dataCompetencia = HelperDate.getCurrentCompetence(periodo.getInicial());
        block0: for (HistoricoSalarialDaVerba historicoDaVerba : historicosDaVerba) {
            if (Utils.naoNulo((Object)historicoDaVerba.getHistoricoSalarial().getTipoVariacaoParcela()) && !TipoVariacaoDaParcelaEnum.FIXA.equals((Object)historicoDaVerba.getHistoricoSalarial().getTipoVariacaoParcela()) && Utils.naoNulo(periodoParaMedia)) {
                valorMedia = Utils.somar(valorMedia, Utils.multiplicar(ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(periodoParaMedia.getFinal(), periodo.getInicial()), this.calcularMedia(historicoDaVerba.getHistoricoSalarial(), periodoParaMedia)), valorMedia);
                continue;
            }
            HistoricoSalarial historicoSalarial = HistoricoSalarial.obter(historicoDaVerba.getHistoricoSalarial().getId());
            for (OcorrenciaDoHistoricoSalarial ocorrencia : historicoSalarial.getOcorrencias()) {
                if (!HelperDate.dateEquals(dataCompetencia.getDate(), ocorrencia.getDataOcorrencia())) continue;
                if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)historicoDaVerba.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)historicoDaVerba.getVerbaDeCalculo().getCalculo().getRegimeDoContrato())) {
                    BigDecimal valorParcial = ocorrencia.getValor().divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
                    valorParcial = valorParcial.multiply(new BigDecimal(periodo.totalDeDias()), Utils.CONTEXTO_MATEMATICO);
                    valorTotal = valorTotal.add(valorParcial);
                    continue block0;
                }
                if (historicoDaVerba.getAplicarProporcionalidade().booleanValue()) {
                    int diasParaExcluir = 0;
                    if (historicoDaVerba.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                        diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterDiasFerias(periodo);
                    }
                    if (periodo.totalDeDias() - diasParaExcluir == 31) {
                        diasParaExcluir = 1;
                    }
                    if (historicoDaVerba.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                        diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterFaltasJustificadas(periodo);
                    }
                    if (historicoDaVerba.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                        diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterFaltasNaoJustificadas(periodo);
                    }
                    valorTotalIntegral = Utils.nulo(valorTotalIntegral) ? ocorrencia.getValor() : valorTotalIntegral.add(ocorrencia.getValor(), Utils.CONTEXTO_MATEMATICO);
                    CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(periodo, ocorrencia.getValor(), diasParaExcluir);
                    proporcionalizar.executar();
                    valorTotal = valorTotal.add(proporcionalizar.getResultado(), Utils.CONTEXTO_MATEMATICO);
                    continue block0;
                }
                int diasParaExcluir = 0;
                if (historicoDaVerba.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                    diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterDiasFerias(periodo);
                }
                if (periodo.totalDeDias() - diasParaExcluir == 31) {
                    diasParaExcluir = 1;
                }
                if (historicoDaVerba.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                    diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterFaltasJustificadas(periodo);
                }
                if (historicoDaVerba.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                    diasParaExcluir += historicoDaVerba.getVerbaDeCalculo().getCalculo().obterFaltasNaoJustificadas(periodo);
                }
                BigDecimal valorIntegral = this.atualizarValorIntegral(periodo, ocorrencia, diasParaExcluir);
                valorTotalIntegral = valorTotalIntegral == null ? valorIntegral : Utils.somar(valorTotalIntegral, valorIntegral, valorTotalIntegral);
                valorTotal = valorTotal.add(ocorrencia.getValor());
                continue block0;
            }
        }
        this.parametroDoTermo.setValorIntegral(valorTotalIntegral);
        return Utils.somar(valorTotal, valorMedia);
    }

    private BigDecimal atualizarValorIntegral(Periodo periodo, OcorrenciaDoHistoricoSalarial ocorrencia, int diasParaExcluir) {
        BigDecimal valorIntegral = null;
        if (periodo.totalDeDias() - diasParaExcluir > 0) {
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodo, ocorrencia.getValor(), diasParaExcluir);
            integralizar.executar();
            valorIntegral = integralizar.getResultado();
        }
        return valorIntegral;
    }

    private BigDecimal calcularMedia(HistoricoSalarial historicoSalarial, Periodo periodoParaMedia) {
        BigDecimal media = BigDecimal.ZERO;
        boolean ehPossivelTerMudancaDeMoeda = HelperDate.dateBeforeOrEquals(periodoParaMedia.getInicial(), ConversaoDeMoedas.obterDataUltimaConversaoDeMoeda());
        List<Periodo> periodos = HelperDate.breakInMonths(periodoParaMedia.getInicial(), periodoParaMedia.getFinal());
        HashMap<Date, BigDecimal> valorOcorrencias = new HashMap<Date, BigDecimal>();
        for (OcorrenciaDoHistoricoSalarial ocorrencia : historicoSalarial.getOcorrencias()) {
            valorOcorrencias.put(ocorrencia.getDataOcorrencia(), ocorrencia.getValor());
        }
        for (Periodo p : periodos) {
            HelperDate competencia = HelperDate.getCurrentCompetence(p.getInicial());
            HelperDate proximaCompetencia = competencia.clone().addMonth(1);
            if (ehPossivelTerMudancaDeMoeda) {
                media = Utils.somar(media, Utils.multiplicar((BigDecimal)valorOcorrencias.get(competencia.getDate()), ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(proximaCompetencia.getDate(), periodoParaMedia.getFinal())), media);
                continue;
            }
            media = Utils.somar(media, (BigDecimal)valorOcorrencias.get(competencia.getDate()), media);
        }
        if (!periodos.isEmpty()) {
            media = Utils.dividir(media, new BigDecimal(periodos.size()));
        }
        return media;
    }

    private BigDecimal obterValorTotalDasBasesEmMesesDiferentes(List<HistoricoSalarialDaVerba> historicosDaVerba, Periodo periodo, Periodo periodoParaMedia) {
        BigDecimal valorTotal = BigDecimal.ZERO;
        HelperDate dataInicial = HelperDate.getInstance(periodo.getInicial());
        HelperDate dataFinal = dataInicial.clone();
        dataFinal.addMonth(1);
        dataFinal.setDay(1);
        dataFinal.addDay(-1);
        Periodo primeiroPeriodo = new Periodo(dataInicial, dataFinal);
        dataFinal = HelperDate.getInstance(periodo.getFinal());
        dataInicial = dataFinal.clone();
        dataInicial.setDay(1);
        Periodo segundoPeriodo = new Periodo(dataInicial, dataFinal);
        BigDecimal valorPrimeiroPeriodo = this.obterValorTotalDasBasesNoMesmoMes(historicosDaVerba, primeiroPeriodo, periodoParaMedia);
        BigDecimal valorSegundoPeriodo = this.obterValorTotalDasBasesNoMesmoMes(historicosDaVerba, segundoPeriodo, periodoParaMedia);
        BigDecimal fatorConversao = this.verificaSeExisteFatorPorConversaoDeConversaoDeMoeda(segundoPeriodo);
        if (Utils.naoNulo(fatorConversao)) {
            valorSegundoPeriodo = valorSegundoPeriodo.multiply(fatorConversao, Utils.CONTEXTO_MATEMATICO);
        }
        valorTotal = valorTotal.add(valorPrimeiroPeriodo, Utils.CONTEXTO_MATEMATICO);
        valorTotal = valorTotal.add(valorSegundoPeriodo, Utils.CONTEXTO_MATEMATICO);
        return valorTotal;
    }

    private BigDecimal verificaSeExisteFatorPorConversaoDeConversaoDeMoeda(Periodo segundoPeriodo) {
        return ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(HelperDate.getCurrentCompetence(segundoPeriodo.getInicial()).getDate());
    }

    public String toString() {
        return Utils.formatarNumero(this.resolverValor(null));
    }
}

