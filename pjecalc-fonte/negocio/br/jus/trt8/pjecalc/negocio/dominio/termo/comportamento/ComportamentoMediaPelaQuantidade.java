/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVariacaoDaParcelaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoDaBaseDoReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Calculada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ComportamentoMediaPelaQuantidade
extends ComportamentoDaBaseDoReflexo {
    private static final long serialVersionUID = -2551689556247306275L;
    private static final int DOZE_MESES = 12;

    @Override
    public BigDecimal resolverValor(ItemBaseVerba item, ParametroDoTermo parametro) {
        int quantidadePeriodosDaMedia = this.obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(parametro);
        if (quantidadePeriodosDaMedia <= 0) {
            return BigDecimal.ZERO;
        }
        List<OcorrenciaDeVerba> ocorrencias = this.obterOcorrenciasDoPeriodoDaMediaDoReflexo(parametro, item.getVerbaDeCalculo());
        if (ocorrencias.isEmpty()) {
            return BigDecimal.ZERO;
        }
        VerbaDeCalculo base = item.getVerbaDeCalculo();
        BigDecimal mediaQuantidade = BigDecimal.ZERO;
        BigDecimal valorTotalPagoParaAbater = BigDecimal.ZERO;
        HashMap<Date, List<OcorrenciaDeVerba>> ocorrenciasAgrupadas = new HashMap<Date, List<OcorrenciaDeVerba>>();
        this.agruparOcorrencias(ocorrencias, ocorrenciasAgrupadas);
        for (Map.Entry entry : ocorrenciasAgrupadas.entrySet()) {
            List ocorrenciasDaCompetencia = (List)entry.getValue();
            HashSet<Date> diasCobertos = new HashSet<Date>();
            int diasParaExcluir = 0;
            BigDecimal valorQuantidadeDaCompetencia = BigDecimal.ZERO;
            Object valorQuantidadeDaCompetenciaIntegral = null;
            BigDecimal valorPagoParaAbaterDaCompetencia = BigDecimal.ZERO;
            BigDecimal valorPagoParaAbaterDaCompetenciaIntegral = null;
            for (OcorrenciaDeVerba ocorrencia : ocorrenciasDaCompetencia) {
                if (!ocorrencia.getAtivo().booleanValue()) continue;
                this.marcarDias(diasCobertos, ocorrencia);
                diasParaExcluir += ocorrencia.verificaDiasParaExcluirDeAcordoComA(base);
                BigDecimal valorQuantidade = ocorrencia.getQuantidade().multiply(ocorrencia.getMultiplicador(), Utils.CONTEXTO_MATEMATICO);
                BigDecimal valorQuantidadeIntegral = ocorrencia.getQuantidadeIntegral();
                if (Utils.naoNulo(valorQuantidadeIntegral)) {
                    valorQuantidadeIntegral = valorQuantidadeIntegral.multiply(ocorrencia.getMultiplicador(), Utils.CONTEXTO_MATEMATICO);
                }
                if (ocorrencia.getDobra().booleanValue()) {
                    valorQuantidade = valorQuantidade.multiply(new BigDecimal(2), Utils.CONTEXTO_MATEMATICO);
                    if (Utils.naoNulo(valorQuantidadeIntegral)) {
                        valorQuantidadeIntegral = valorQuantidadeIntegral.multiply(new BigDecimal(2), Utils.CONTEXTO_MATEMATICO);
                    }
                }
                if (ocorrencia.getDevido().compareTo(BigDecimal.ZERO) == 0 && TipoDeGeracaoEnum.DIFERENCA.equals((Object)item.getVerbaDeCalculo().getGerarReflexo())) {
                    valorPagoParaAbaterDaCompetencia = valorPagoParaAbaterDaCompetencia.add(ocorrencia.getDiferenca(), Utils.CONTEXTO_MATEMATICO);
                } else if (ocorrencia.getDevido().compareTo(BigDecimal.ZERO) != 0 && TipoDeGeracaoEnum.DIFERENCA.equals((Object)item.getVerbaDeCalculo().getGerarReflexo())) {
                    valorQuantidade = valorQuantidade.multiply(ocorrencia.getDiferenca(), Utils.CONTEXTO_MATEMATICO);
                    valorQuantidade = valorQuantidade.divide(ocorrencia.getDevido(), Utils.CONTEXTO_MATEMATICO);
                }
                if (BigDecimal.ZERO.compareTo(ocorrencia.getDevidoIntegral()) == 0 && TipoDeGeracaoEnum.DIFERENCA.equals((Object)item.getVerbaDeCalculo().getGerarReflexo()) && Utils.nulo(valorPagoParaAbaterDaCompetenciaIntegral)) {
                    valorPagoParaAbaterDaCompetenciaIntegral = ocorrencia.getDiferencaIntegral();
                } else if (BigDecimal.ZERO.compareTo(ocorrencia.getDevidoIntegral()) != 0 && TipoDeGeracaoEnum.DIFERENCA.equals((Object)item.getVerbaDeCalculo().getGerarReflexo()) && Utils.naoNulo(valorQuantidadeIntegral)) {
                    valorQuantidadeIntegral = valorQuantidadeIntegral.multiply(ocorrencia.getDiferencaIntegral(), Utils.CONTEXTO_MATEMATICO);
                    valorQuantidadeIntegral = valorQuantidadeIntegral.divide(ocorrencia.getDevidoIntegral(), Utils.CONTEXTO_MATEMATICO);
                }
                valorQuantidadeDaCompetencia = valorQuantidadeDaCompetencia.add(valorQuantidade, Utils.CONTEXTO_MATEMATICO);
                if (!Utils.nulo(valorQuantidadeDaCompetenciaIntegral)) continue;
                valorQuantidadeDaCompetenciaIntegral = valorQuantidadeIntegral;
            }
            switch (((Reflexo)parametro.getVerbaDeCalculo()).getTratamentoDaFracaoDeMesDoReflexo()) {
                case MANTER: {
                    mediaQuantidade = mediaQuantidade.add(valorQuantidadeDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    valorTotalPagoParaAbater = valorTotalPagoParaAbater.add(valorPagoParaAbaterDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case INTEGRALIZAR: {
                    Periodo periodoCondensadoParaCalculoDaIntegralizacao;
                    BigDecimal aux;
                    int qtdDias = diasCobertos.size();
                    if ((qtdDias -= diasParaExcluir) < 0) {
                        qtdDias = 0;
                    }
                    valorQuantidadeDaCompetencia = Utils.nulo(aux = this.encontrarQuantidadeDaCompetencia((BigDecimal)valorQuantidadeDaCompetenciaIntegral, qtdDias, periodoCondensadoParaCalculoDaIntegralizacao = new Periodo(HelperDate.getInstance((Date)entry.getKey()).setDay(1).getDate(), HelperDate.getInstance((Date)entry.getKey()).setDay(diasCobertos.size()).getDate()), valorQuantidadeDaCompetencia, diasParaExcluir)) ? valorQuantidadeDaCompetencia : aux;
                    aux = this.encontrarValorPagoParaAbaterDaCompetencia(valorPagoParaAbaterDaCompetenciaIntegral, qtdDias, periodoCondensadoParaCalculoDaIntegralizacao, valorPagoParaAbaterDaCompetencia, diasParaExcluir);
                    valorPagoParaAbaterDaCompetencia = Utils.nulo(aux) ? valorPagoParaAbaterDaCompetencia : aux;
                    mediaQuantidade = mediaQuantidade.add(valorQuantidadeDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    valorTotalPagoParaAbater = valorTotalPagoParaAbater.add(valorPagoParaAbaterDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case DESPREZAR: {
                    int qtdDias = diasCobertos.size();
                    qtdDias -= diasParaExcluir;
                    Date inicioMes = HelperDate.getInstance((Date)entry.getKey()).setDay(1).getDate();
                    Date fimMes = HelperDate.getInstance((Date)entry.getKey()).setDay(HelperDate.getInstance((Date)entry.getKey()).daysInMonth()).getDate();
                    Periodo mesVerbaBase = new Periodo(inicioMes, fimMes);
                    int totalDiasMesVerbaBase = mesVerbaBase.totalDeDias();
                    if (totalDiasMesVerbaBase == 31) {
                        --totalDiasMesVerbaBase;
                    }
                    if (qtdDias < totalDiasMesVerbaBase) {
                        --quantidadePeriodosDaMedia;
                        break;
                    }
                    mediaQuantidade = mediaQuantidade.add(valorQuantidadeDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    valorTotalPagoParaAbater = valorTotalPagoParaAbater.add(valorPagoParaAbaterDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case DESPREZAR_MENOR_QUE_15_DIAS: {
                    int qtdDias = diasCobertos.size();
                    if ((qtdDias -= diasParaExcluir) < 15) {
                        --quantidadePeriodosDaMedia;
                        break;
                    }
                    mediaQuantidade = mediaQuantidade.add(valorQuantidadeDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    valorTotalPagoParaAbater = valorTotalPagoParaAbater.add(valorPagoParaAbaterDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                }
            }
        }
        if (quantidadePeriodosDaMedia <= 0 || mediaQuantidade.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        mediaQuantidade = mediaQuantidade.divide(new BigDecimal(quantidadePeriodosDaMedia), Utils.CONTEXTO_MATEMATICO);
        valorTotalPagoParaAbater = valorTotalPagoParaAbater.divide(new BigDecimal(quantidadePeriodosDaMedia), Utils.CONTEXTO_MATEMATICO);
        BigDecimal baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo = BigDecimal.ZERO;
        BigDecimal divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = BigDecimal.ZERO;
        ParametroDoTermo parametroSimulado = new ParametroDoTermo(parametro.getCalculo(), item.getVerbaDeCalculo(), null, parametro.getModo(), parametro.getFase(), null, null);
        List<Periodo> periodosSimulados = HelperDate.breakInMonths(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal());
        long diasTotais = HelperDate.getInstance(parametro.getPeriodo().getFinal()).subtractDays(parametro.getPeriodo().getInicial()) + 1L;
        for (Periodo periodoSimulado : periodosSimulados) {
            long diasPeriodo = periodoSimulado.totalDeDias();
            HelperDate comecoPeriodoSimulado = HelperDate.getCurrentCompetence(periodoSimulado.getInicial());
            HelperDate terminoPeriodoSimulado = HelperDate.getCurrentCompetence(periodoSimulado.getInicial()).setDay(comecoPeriodoSimulado.daysInMonth());
            Periodo periosoSimulado = new Periodo(comecoPeriodoSimulado.getDate(), terminoPeriodoSimulado.getDate());
            parametroSimulado.setPeriodo(periosoSimulado);
            if (Utils.nulo(parametroSimulado.getPeriodoParaMedia())) {
                switch (((Reflexo)parametro.getVerbaDeCalculo()).getPeriodoMediaReflexo()) {
                    case PERIODO_AQUISITIVO: {
                        parametroSimulado.setPeriodoParaMedia(this.obterUltimosDozeMeses(periosoSimulado, parametro.getCalculo().getDataAdmissao()));
                        break;
                    }
                    case ANO_CIVIL: 
                    case ULTIMOS_DOZE_MESES_DO_CONTRATO: 
                    case DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
                        parametroSimulado.setPeriodoParaMedia(this.obterPeriodoDaMedia(ocorrenciasAgrupadas.keySet()));
                    }
                }
            }
            BigDecimal baseSimulada = this.obterBaseSimulada(item, parametroSimulado);
            baseSimulada = baseSimulada.multiply(new BigDecimal(diasPeriodo), Utils.CONTEXTO_MATEMATICO);
            baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo = baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo.add(baseSimulada, Utils.CONTEXTO_MATEMATICO);
            BigDecimal mediaDivisor = this.obterMediaDivisor(item, parametroSimulado.getPeriodoParaMedia());
            if (BigDecimal.ZERO.compareTo(mediaDivisor) == 0) {
                mediaDivisor = this.obterMediaDivisor(item, parametro.getPeriodoAquisitivo());
            }
            mediaDivisor = mediaDivisor.multiply(new BigDecimal(diasPeriodo), Utils.CONTEXTO_MATEMATICO);
            divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo.add(mediaDivisor, Utils.CONTEXTO_MATEMATICO);
        }
        baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo = baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo.divide(new BigDecimal(diasTotais), Utils.CONTEXTO_MATEMATICO);
        if (BigDecimal.ZERO.equals(divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo.divide(new BigDecimal(diasTotais), Utils.CONTEXTO_MATEMATICO))) {
            divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = BigDecimal.ONE;
        }
        OcorrenciaDeVerba ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo = this.obterOcorrenciaMaisRecente(item.getVerbaDeCalculo().obterOcorrenciasDoMes(parametro.getPeriodo().getFinal()));
        if (!this.utilizarDivisorVariavel(item.getVerbaDeCalculo()) && ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo != null && ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo.getAtivo().booleanValue()) {
            divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo.getDivisor();
        } else if (!this.utilizarDivisorVariavel(item.getVerbaDeCalculo())) {
            HelperDate dataAuxiliar = HelperDate.getInstance(parametro.getPeriodo().getFinal()).addMonth(-1);
            boolean encontrouOcorrenciaDaVerbaPrincipal = false;
            while (!encontrouOcorrenciaDaVerbaPrincipal && HelperDate.dateBeforeOrEquals(parametro.getCalculo().getDataAdmissao(), dataAuxiliar.getDate())) {
                ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo = this.obterOcorrenciaMaisRecente(item.getVerbaDeCalculo().obterOcorrenciasDoMes(dataAuxiliar.getDate()));
                if (ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo != null && ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo.getAtivo().booleanValue()) {
                    divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = ocorrenciaVerbaPrincipalNaUltimaCompetenciaDoPeriodoDeOcorrenciaDoReflexo.getDivisor();
                    encontrouOcorrenciaDaVerbaPrincipal = true;
                    continue;
                }
                dataAuxiliar.addMonth(-1);
            }
            if (!encontrouOcorrenciaDaVerbaPrincipal) {
                HelperDate ultimoMesDoReflexo = HelperDate.getCurrentCompetence(parametro.getPeriodo().getFinal());
                parametroSimulado.setPeriodo(new Periodo(ultimoMesDoReflexo.getDate(), ultimoMesDoReflexo.lastDayOfTheMonth().getDate()));
                divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo = ((FormulaReflexo)item.getVerbaDeCalculo().getFormula()).getDivisor().resolverValor(parametroSimulado);
            }
        }
        BigDecimal valor = baseDaVerbaPrincipalNoPeriodoDeOcorrenciaDoReflexo.multiply(mediaQuantidade, Utils.CONTEXTO_MATEMATICO);
        valor = valor.divide(divisorDaVerbaPrincipalNoMesDeOcorrenciaDoReflexo, Utils.CONTEXTO_MATEMATICO);
        valor = valor.add(valorTotalPagoParaAbater, Utils.CONTEXTO_MATEMATICO);
        if (parametro.getVerbaDeCalculo().isCaracteristicaFerias()) {
            valor = this.verificarValorParaFerias(parametro, valor, parametro.getPeriodo().totalDeDias());
        }
        return valor;
    }

    private boolean utilizarDivisorVariavel(VerbaDeCalculo verba) {
        block4: {
            block3: {
                if (!(verba instanceof Calculada)) break block3;
                for (HistoricoSalarialDaVerba baseHistorico : verba.getHistoricosDaVerbaDoValorDevido()) {
                    if (!TipoVariacaoDaParcelaEnum.VARIAVEL.equals((Object)baseHistorico.getHistoricoSalarial().getTipoVariacaoParcela())) continue;
                    return true;
                }
                for (ItemBaseVerba base : ((FormulaCalculada)verba.getFormula()).getBaseVerba().getItens()) {
                    if (!TipoVariacaoDaParcelaEnum.VARIAVEL.equals((Object)base.getVerbaDeCalculo().getTipoVariacaoParcela())) continue;
                    return true;
                }
                break block4;
            }
            if (!(verba instanceof Reflexo)) break block4;
            for (ItemBaseVerba base : ((FormulaReflexo)verba.getFormula()).getBaseVerba().getItens()) {
                if (!TipoVariacaoDaParcelaEnum.VARIAVEL.equals((Object)base.getVerbaDeCalculo().getTipoVariacaoParcela())) continue;
                return true;
            }
        }
        return false;
    }

    private BigDecimal obterMediaDivisor(ItemBaseVerba item, Periodo periodoParaMedia) {
        BigDecimal mediaDivisor = BigDecimal.ZERO;
        List<Periodo> meses = HelperDate.breakInMonths(periodoParaMedia.getInicial(), periodoParaMedia.getFinal());
        int totalMeses = meses.size();
        for (Periodo mes : meses) {
            Competencia competencia = new Competencia(mes.getFinal());
            Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = item.getVerbaDeCalculo().getOcorrenciasAtivasOptimizerListSearch().search(competencia);
            if (Utils.nulo(ocorrenciasDeVerba)) {
                --totalMeses;
                continue;
            }
            while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
                if (Utils.nulo(ocorrenciaDeVerba) || BigDecimal.ZERO.compareTo(ocorrenciaDeVerba.getDivisor()) == 0) {
                    --totalMeses;
                    continue;
                }
                mediaDivisor = Utils.somar(mediaDivisor, ocorrenciaDeVerba.getDivisor(), mediaDivisor);
            }
        }
        if (totalMeses > 0) {
            mediaDivisor = Utils.dividir(mediaDivisor, BigDecimal.valueOf(totalMeses));
        }
        return mediaDivisor;
    }

    private BigDecimal encontrarValorPagoParaAbaterDaCompetencia(BigDecimal valorPagoParaAbaterDaCompetenciaIntegral, int qtdDias, Periodo periodoCondensadoParaCalculoDaIntegralizacao, BigDecimal valorPagoParaAbaterDaCompetencia, Integer diasParaExcluir) {
        if (Utils.naoNulo(valorPagoParaAbaterDaCompetenciaIntegral)) {
            return valorPagoParaAbaterDaCompetenciaIntegral;
        }
        if (qtdDias > 0) {
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoCondensadoParaCalculoDaIntegralizacao, valorPagoParaAbaterDaCompetencia, diasParaExcluir);
            integralizar.executar();
            return integralizar.getResultado();
        }
        return null;
    }

    private BigDecimal encontrarQuantidadeDaCompetencia(BigDecimal valorQuantidadeDaCompetenciaIntegral, int qtdDias, Periodo periodoCondensadoParaCalculoDaIntegralizacao, BigDecimal valorQuantidadeDaCompetencia, Integer diasParaExcluir) {
        if (Utils.naoNulo(valorQuantidadeDaCompetenciaIntegral)) {
            return valorQuantidadeDaCompetenciaIntegral;
        }
        if (qtdDias > 0) {
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoCondensadoParaCalculoDaIntegralizacao, valorQuantidadeDaCompetencia, diasParaExcluir);
            integralizar.executar();
            return integralizar.getResultado();
        }
        return null;
    }

    private Periodo obterPeriodoDaMedia(Set<Date> ocorrencias) {
        Date dateInicial = null;
        Date dateFinal = null;
        for (Date ocorrencia : ocorrencias) {
            if (Utils.nulos(dateInicial, dateFinal)) {
                dateInicial = ocorrencia;
                dateFinal = ocorrencia;
            }
            if (HelperDate.dateBefore(ocorrencia, dateInicial)) {
                dateInicial = ocorrencia;
            }
            if (!HelperDate.dateAfter(ocorrencia, dateFinal)) continue;
            dateFinal = ocorrencia;
        }
        return new Periodo(dateInicial, dateFinal);
    }

    private Periodo obterUltimosDozeMeses(Periodo periodo, Date dataAdmissao) {
        Date inicial = HelperDate.getInstance(periodo.getInicial()).addMonth(-12).setDay(1).getDate();
        Date dataFinal = HelperDate.getInstance(periodo.getInicial()).addMonth(-1).lastDayOfTheMonth().getDate();
        Periodo ultimosDozeMeses = new Periodo(inicial, dataFinal);
        if (HelperDate.dateAfter(dataAdmissao, dataFinal)) {
            return periodo;
        }
        if (HelperDate.dateAfter(dataAdmissao, inicial)) {
            ultimosDozeMeses.setInicial(dataAdmissao);
        }
        return ultimosDozeMeses;
    }

    private OcorrenciaDeVerba obterOcorrenciaMaisRecente(List<OcorrenciaDeVerba> ocorrencias) {
        OcorrenciaDeVerba maisRecente = null;
        for (OcorrenciaDeVerba ocorrencia : ocorrencias) {
            if (maisRecente == null) {
                if (!ocorrencia.getAtivo().booleanValue()) continue;
                maisRecente = ocorrencia;
                continue;
            }
            if (!ocorrencia.getAtivo().booleanValue() || !HelperDate.dateAfter(ocorrencia.getDataFinal(), maisRecente.getDataFinal())) continue;
            maisRecente = ocorrencia;
        }
        return maisRecente;
    }

    private BigDecimal obterBaseSimulada(ItemBaseVerba item, ParametroDoTermo parametro) {
        if (item.getVerbaDeCalculo() instanceof Calculada) {
            BigDecimal totalDaBaseTabelada = ((FormulaCalculada)item.getVerbaDeCalculo().getFormula()).getBaseTabelada().resolverValor(parametro);
            BigDecimal totalDaBaseVerba = ((FormulaCalculada)item.getVerbaDeCalculo().getFormula()).getBaseVerba().resolverValor(parametro);
            if (Utils.naoNulos(totalDaBaseVerba, totalDaBaseTabelada)) {
                return totalDaBaseVerba.add(totalDaBaseTabelada, Utils.CONTEXTO_MATEMATICO);
            }
            if (Utils.naoNulo(totalDaBaseVerba)) {
                return totalDaBaseVerba;
            }
            if (Utils.naoNulo(totalDaBaseTabelada)) {
                return totalDaBaseTabelada;
            }
        } else if (item.getVerbaDeCalculo() instanceof Reflexo) {
            return ((FormulaReflexo)item.getVerbaDeCalculo().getFormula()).getBaseVerba().resolverValor(parametro);
        }
        return BigDecimal.ZERO;
    }
}

