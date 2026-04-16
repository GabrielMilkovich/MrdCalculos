/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDaVerbaUnique;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

public abstract class MaquinaDeCalculo<T extends VerbaDeCalculo>
implements Serializable {
    private static final long serialVersionUID = 1424284919681988867L;
    private static final int VENCIMENTO_DEZEMBRO = 20;
    private static final long QUANTIDADE_DIAS_MINIMA_PARA_UM_AVO = 15L;
    private static final BigDecimal VALOR_PARA_APLICAR_DOBRA = new BigDecimal("2");
    private T verba;
    private ModoDeCalculoEnum modo;
    private boolean executando = false;

    public MaquinaDeCalculo(T verba) {
        this.verba = verba;
    }

    protected ServicoDeCalculo getServicoDeCalculo() {
        return ServicoDeCalculo.getInstancia();
    }

    public void gerarOcorrencias(boolean manterAlteracoes) throws NegocioException {
        if (this.isExecutando()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Depend\u00eancia c\u00edclica na verba '" + ((VerbaDeCalculo)this.getVerba()).getNome() + "'."));
        }
        this.iniciarExecucao();
        try {
            this.executarGerarOcorrencias(manterAlteracoes);
        }
        finally {
            this.finalizarExecucao();
        }
    }

    private void executarGerarOcorrencias(boolean manterAlteracoes) throws NegocioException {
        HelperDate dataDemissao;
        if (Utils.nulos(((VerbaDeCalculo)this.getVerba()).getPeriodoInicial(), ((VerbaDeCalculo)this.getVerba()).getPeriodoFinal())) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Per\u00edodo inicial ou final em branco"));
        }
        ((VerbaDeCalculo)this.verba).setCalculo((Calculo)((VerbaDeCalculo)this.verba).getCalculo().restaurar());
        this.modo = ModoDeCalculoEnum.GERACAO_DE_OCORRENCIA;
        OptimizerListSearchUnique<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba> ocorrenciasAntigas = null;
        if (manterAlteracoes) {
            ocorrenciasAntigas = ((VerbaDeCalculo)this.getVerba()).getOcorrenciasOptimizerListSearchUnique();
        }
        ((VerbaDeCalculo)this.verba).limparOcorrencias(false);
        this.getServicoDeCalculo().obterFeriasDoCalculo();
        if (((VerbaDeCalculo)this.verba).getOcorrenciaDePagamento() == OcorrenciaDePagamentoEnum.DESLIGAMENTO) {
            dataDemissao = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getCalculo().getDataDemissao());
            if (dataDemissao != null) {
                Periodo periodo;
                HelperDate dataFinal;
                Object dataInicial;
                if (HelperDate.dateBeforeOrEquals(dataDemissao.getDate(), ((VerbaDeCalculo)this.verba).getPeriodoFinal())) {
                    dataInicial = null;
                    if (((VerbaDeCalculo)this.verba).getCaracteristica() == CaracteristicaDaVerbaEnum.COMUM) {
                        dataInicial = dataDemissao.clone();
                        ((HelperDate)dataInicial).setDay(1);
                        if (HelperDate.dateAfter(((VerbaDeCalculo)this.verba).getPeriodoInicial(), ((HelperDate)dataInicial).getDate())) {
                            dataInicial = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getPeriodoInicial());
                        }
                    } else if (((VerbaDeCalculo)this.verba).getCaracteristica() == CaracteristicaDaVerbaEnum.AVISO_PREVIO) {
                        dataInicial = dataDemissao.clone();
                    }
                    dataFinal = dataDemissao.clone();
                    periodo = new Periodo((HelperDate)dataInicial, dataFinal);
                    this.criarOcorrencia(periodo);
                } else if (HelperDate.getInstance(((VerbaDeCalculo)this.verba).getPeriodoFinal()).compareMonthAndYear(dataDemissao.getDate()) && CaracteristicaDaVerbaEnum.COMUM.equals((Object)((VerbaDeCalculo)this.verba).getCaracteristica())) {
                    dataInicial = null;
                    dataInicial = dataDemissao.clone();
                    ((HelperDate)dataInicial).setDay(1);
                    if (HelperDate.dateAfter(((VerbaDeCalculo)this.verba).getPeriodoInicial(), ((HelperDate)dataInicial).getDate())) {
                        dataInicial = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getPeriodoInicial());
                    }
                    dataFinal = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getPeriodoFinal());
                    periodo = new Periodo((HelperDate)dataInicial, dataFinal);
                    this.criarOcorrencia(periodo);
                }
            }
        } else if (((VerbaDeCalculo)this.verba).getOcorrenciaDePagamento() == OcorrenciaDePagamentoEnum.MENSAL) {
            List<Periodo> periodos = HelperDate.breakInMonths(((VerbaDeCalculo)this.verba).getPeriodoInicial(), ((VerbaDeCalculo)this.verba).getPeriodoFinal());
            for (Periodo periodo : periodos) {
                this.criarOcorrencia(periodo);
            }
        } else if (((VerbaDeCalculo)this.verba).getOcorrenciaDePagamento() == OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO) {
            Calculo calculo = this.getServicoDeCalculo().obterCalculoAberto();
            ArrayList<Periodo> periodosAquisitivos = new ArrayList<Periodo>();
            Periodo ultimoPeriodoAquisitivoCompleto = null;
            Object periodoFracionario = null;
            for (Ferias ferias : this.getServicoDeCalculo().obterFeriasDoCalculo()) {
                if (ultimoPeriodoAquisitivoCompleto == null || HelperDate.dateAfter(ferias.getPeriodoAquisitivo().getFinal(), ultimoPeriodoAquisitivoCompleto.getFinal())) {
                    ultimoPeriodoAquisitivoCompleto = ferias.getPeriodoAquisitivo();
                }
                periodosAquisitivos.add(ferias.getPeriodoAquisitivo());
            }
            if (Utils.naoNulo(calculo.getDataDemissao()) && HelperDate.dateBeforeOrEquals(calculo.getDataDemissao(), ((VerbaDeCalculo)this.verba).getPeriodoFinal())) {
                HelperDate dataDemissaoProjetada = HelperDate.getInstance(calculo.getDataDemissao());
                if (calculo.getProjetaAvisoIndenizado().booleanValue()) {
                    dataDemissaoProjetada.addDay(calculo.obterQuantidadeAdicionalAvisoPrevio());
                }
                HelperDate dataInicialDoPeriodoAquisitivoFracionario = null;
                dataInicialDoPeriodoAquisitivoFracionario = ultimoPeriodoAquisitivoCompleto == null ? HelperDate.getInstance(calculo.getDataAdmissao()) : HelperDate.getInstance(ultimoPeriodoAquisitivoCompleto.getFinal()).addDay(1);
                if (dataDemissaoProjetada.subtractDays(dataInicialDoPeriodoAquisitivoFracionario = this.verificarFaltaQueReiniciePeriodoAquisitivo(dataInicialDoPeriodoAquisitivoFracionario)) + 1L >= 15L) {
                    periodoFracionario = new Periodo(dataInicialDoPeriodoAquisitivoFracionario.getDate(), dataDemissaoProjetada.getDate());
                }
            }
            block6: for (Periodo periodoAquisitivo : periodosAquisitivos) {
                boolean tratado = false;
                for (Ferias ferias : this.getServicoDeCalculo().obterFeriasDoCalculo()) {
                    if (ferias.getPeriodoAquisitivo().isMesmoPeriodo(periodoAquisitivo)) {
                        tratado = true;
                        switch (ferias.getSituacao()) {
                            case GOZADAS: 
                            case GOZADAS_PARCIALMENTE: {
                                boolean condicaoDemissao;
                                int totalDiasGozo = 0;
                                Date dataFimDoPeriodoConcessivo = ferias.getPeriodoConcessivo().getFinal();
                                if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo1(), ferias.getDataFinalDoPeriodoDeGozo1())) {
                                    if (HelperDate.dateAfterOrEquals(ferias.getDataInicialDoPeriodoDeGozo1(), ((VerbaDeCalculo)this.verba).getPeriodoInicial()) && HelperDate.dateBeforeOrEquals(ferias.getDataInicialDoPeriodoDeGozo1(), ((VerbaDeCalculo)this.verba).getPeriodoFinal())) {
                                        List<Periodo> periodosGozo1 = ferias.getPeriodoDeGozo1().dividirNaData(dataFimDoPeriodoConcessivo);
                                        for (Periodo periodoGozo1 : periodosGozo1) {
                                            if (periodosGozo1.size() == 2 && HelperDate.dateBeforeOrEquals(periodoGozo1.getInicial(), dataFimDoPeriodoConcessivo)) {
                                                this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo1, periodoAquisitivo, false, false, ferias.getAbono());
                                                continue;
                                            }
                                            this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo1, periodoAquisitivo, ferias.getDobraDoPeriodoDeGozo1(), false, ferias.getAbono());
                                        }
                                    }
                                    totalDiasGozo += ferias.getPeriodoDeGozo1().totalDeDias();
                                }
                                if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo2(), ferias.getDataFinalDoPeriodoDeGozo2())) {
                                    if (HelperDate.dateAfterOrEquals(ferias.getDataInicialDoPeriodoDeGozo2(), ((VerbaDeCalculo)this.verba).getPeriodoInicial()) && HelperDate.dateBeforeOrEquals(ferias.getDataInicialDoPeriodoDeGozo2(), ((VerbaDeCalculo)this.verba).getPeriodoFinal())) {
                                        List<Periodo> periodosGozo2 = ferias.getPeriodoDeGozo2().dividirNaData(dataFimDoPeriodoConcessivo);
                                        for (Periodo periodoGozo2 : periodosGozo2) {
                                            if (periodosGozo2.size() == 2 && HelperDate.dateBeforeOrEquals(periodoGozo2.getInicial(), dataFimDoPeriodoConcessivo)) {
                                                this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo2, periodoAquisitivo, false, false, ferias.getAbono());
                                                continue;
                                            }
                                            this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo2, periodoAquisitivo, ferias.getDobraDoPeriodoDeGozo2(), false, ferias.getAbono());
                                        }
                                    }
                                    totalDiasGozo += ferias.getPeriodoDeGozo2().totalDeDias();
                                }
                                if (Utils.naoNulos(ferias.getDataInicialDoPeriodoDeGozo3(), ferias.getDataFinalDoPeriodoDeGozo3())) {
                                    if (HelperDate.dateAfterOrEquals(ferias.getDataInicialDoPeriodoDeGozo3(), ((VerbaDeCalculo)this.verba).getPeriodoInicial()) && HelperDate.dateBeforeOrEquals(ferias.getDataInicialDoPeriodoDeGozo3(), ((VerbaDeCalculo)this.verba).getPeriodoFinal())) {
                                        List<Periodo> periodosGozo3 = ferias.getPeriodoDeGozo3().dividirNaData(dataFimDoPeriodoConcessivo);
                                        for (Periodo periodoGozo3 : periodosGozo3) {
                                            if (periodosGozo3.size() == 2 && HelperDate.dateBeforeOrEquals(periodoGozo3.getInicial(), dataFimDoPeriodoConcessivo)) {
                                                this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo3, periodoAquisitivo, false, false, ferias.getAbono());
                                                continue;
                                            }
                                            this.criarOcorrenciaComPeriodoAquisitivo(periodoGozo3, periodoAquisitivo, ferias.getDobraDoPeriodoDeGozo3(), false, ferias.getAbono());
                                        }
                                    }
                                    totalDiasGozo += ferias.getPeriodoDeGozo3().totalDeDias();
                                }
                                if (ferias.getAbono().booleanValue()) {
                                    totalDiasGozo += ferias.getQuantidadeDiasAbono().intValue();
                                }
                                boolean condicaoPrescricao = calculo.getPrescricaoQuinquenal() == false || Utils.nulo(calculo.getDataPrescricaoQuinquenal()) || HelperDate.dateBeforeOrEquals(calculo.getDataPrescricaoQuinquenal(), ferias.getDataFinalDoPeriodoConcessivo());
                                boolean bl = condicaoDemissao = calculo.getDataDemissao() != null && HelperDate.dateBeforeOrEquals(calculo.getDataDemissao(), ((VerbaDeCalculo)this.verba).getPeriodoFinal());
                                if (ferias.getPrazo() <= totalDiasGozo || !condicaoDemissao || !condicaoPrescricao) break;
                                this.criarOcorrenciaComPeriodoAquisitivo(new Periodo(calculo.getDataDemissao(), calculo.getDataDemissao()), periodoAquisitivo, ferias.getDobraGeral(), true, ferias.getAbono());
                                break;
                            }
                            case INDENIZADAS: {
                                if (calculo.getDataDemissao() == null || !HelperDate.dateBeforeOrEquals(calculo.getDataDemissao(), ((VerbaDeCalculo)this.verba).getPeriodoFinal()) || calculo.getPrescricaoQuinquenal().booleanValue() && !Utils.nulo(calculo.getDataPrescricaoQuinquenal()) && !HelperDate.dateBeforeOrEquals(calculo.getDataPrescricaoQuinquenal(), ferias.getDataFinalDoPeriodoConcessivo())) break;
                                Periodo periodoOcorrencia = new Periodo(calculo.getDataDemissao(), calculo.getDataDemissao());
                                this.criarOcorrenciaComPeriodoAquisitivo(periodoOcorrencia, periodoAquisitivo, ferias.getDobraGeral(), true);
                                break;
                            }
                        }
                    }
                    if (!tratado) continue;
                    continue block6;
                }
            }
            if (periodoFracionario != null) {
                Periodo periodoOcorrencia = new Periodo(calculo.getDataDemissao(), calculo.getDataDemissao());
                this.criarOcorrenciaComPeriodoAquisitivo(periodoOcorrencia, (Periodo)periodoFracionario, false, true);
            }
        } else if (((VerbaDeCalculo)this.verba).getOcorrenciaDePagamento() == OcorrenciaDePagamentoEnum.DEZEMBRO) {
            dataDemissao = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getCalculo().getDataDemissao());
            HelperDate dataDeFimDoCalculoDaVerba = HelperDate.getInstance(((VerbaDeCalculo)this.verba).getPeriodoFinal());
            List<Periodo> periodos = HelperDate.breakInMonths(((VerbaDeCalculo)this.verba).getPeriodoInicial(), ((VerbaDeCalculo)this.verba).getPeriodoFinal(), 11);
            for (Periodo periodo : periodos) {
                if (Utils.naoNulo(dataDemissao) && dataDeFimDoCalculoDaVerba.compareDate(dataDemissao.getDate()) && periodo.obterDataFinalHelper().compareMonthAndYear(dataDemissao.getDate())) {
                    if (dataDemissao.getDay() > 20 && periodo.obterDataInicialHelper().getDay() <= 20) {
                        periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                        periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                        this.criarOcorrencia(periodo);
                        if (!((VerbaDeCalculo)this.verba).getCalculo().getProjetaAvisoIndenizado().booleanValue()) continue;
                        periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                        periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                        this.criarOcorrencia(periodo);
                        continue;
                    }
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(dataDemissao.getDay()).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(dataDemissao.getDay()).getDate());
                    this.criarOcorrencia(periodo);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() == 1) {
                    if (periodo.obterDataFinalHelper().getDay() == 31) {
                        periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                        periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                        this.criarOcorrencia(periodo);
                        continue;
                    }
                    if (periodo.obterDataFinalHelper().getDay() < 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criarOcorrencia(periodo);
                    continue;
                }
                if (periodo.obterDataFinalHelper().getDay() == 31) {
                    if (periodo.obterDataInicialHelper().getDay() > 20) continue;
                    periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                    periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                    this.criarOcorrencia(periodo);
                    continue;
                }
                if (periodo.obterDataInicialHelper().getDay() > 20 || periodo.obterDataFinalHelper().getDay() < 20) continue;
                periodo.setInicial(HelperDate.getInstance(periodo.getInicial()).setDay(20).getDate());
                periodo.setFinal(HelperDate.getInstance(periodo.getFinal()).setDay(20).getDate());
                this.criarOcorrencia(periodo);
            }
            if (Utils.naoNulo(dataDemissao) && dataDeFimDoCalculoDaVerba.compareDate(dataDemissao.getDate()) && dataDemissao.getMonth() != 11) {
                Periodo periodoOcorrencia = new Periodo(dataDemissao.getDate(), dataDemissao.getDate());
                this.criarOcorrencia(periodoOcorrencia);
            }
        }
        if (Utils.naoNulo(ocorrenciasAntigas)) {
            OcorrenciaDaVerbaUnique key = new OcorrenciaDaVerbaUnique();
            for (OcorrenciaDeVerba ocorrenciaNova : ((VerbaDeCalculo)this.getVerba()).getOcorrencias()) {
                Date dataInicialOriginal = ocorrenciaNova.getDataInicial();
                Date dataFinalOriginal = ocorrenciaNova.getDataFinal();
                if (ocorrenciaNova.getOcorrenciaDePagamento() == OcorrenciaDePagamentoEnum.MENSAL) {
                    HelperDate dataInicial = HelperDate.getInstance(ocorrenciaNova.getDataInicial());
                    dataInicial.setDay(1);
                    ocorrenciaNova.setDataInicial(dataInicial.getDate());
                    HelperDate dataFinal = HelperDate.getInstance(ocorrenciaNova.getDataFinal());
                    dataFinal.setDay(1);
                    ocorrenciaNova.setDataFinal(dataFinal.getDate());
                }
                OcorrenciaDeVerba ocorrenciaAntiga = ocorrenciasAntigas.search(key.update(ocorrenciaNova));
                ocorrenciaNova.setDataInicial(dataInicialOriginal);
                ocorrenciaNova.setDataFinal(dataFinalOriginal);
                key.update(ocorrenciaNova);
                if (!Utils.naoNulo(ocorrenciaAntiga)) continue;
                if (ocorrenciaAntiga.isAtivoAlterado()) {
                    ocorrenciaNova.setAtivo(ocorrenciaAntiga.getAtivo());
                }
                if (ocorrenciaAntiga.isValorAlterado()) {
                    ocorrenciaNova.setValor(ocorrenciaAntiga.getValor());
                }
                if (ocorrenciaAntiga.isDivisorAlterado()) {
                    ocorrenciaNova.setDivisor(ocorrenciaAntiga.getDivisor());
                }
                if (ocorrenciaAntiga.isMultiplicadorAlterado()) {
                    ocorrenciaNova.setMultiplicador(ocorrenciaAntiga.getMultiplicador());
                }
                if (ocorrenciaAntiga.isQuantidadeAlterada()) {
                    ocorrenciaNova.setQuantidade(ocorrenciaAntiga.getQuantidade());
                }
                if (ocorrenciaAntiga.isDobraAlterada()) {
                    ocorrenciaNova.setDobra(ocorrenciaAntiga.getDobra());
                }
                if (ValorDaVerbaEnum.INFORMADO.equals((Object)ocorrenciaAntiga.getValor()) && ocorrenciaAntiga.isDevidoAlterado()) {
                    ocorrenciaNova.setDevido(ocorrenciaAntiga.getDevido());
                }
                if (!ocorrenciaAntiga.isPagoAlterado()) continue;
                ocorrenciaNova.setPago(ocorrenciaAntiga.getPago());
            }
        }
    }

    private HelperDate verificarFaltaQueReiniciePeriodoAquisitivo(HelperDate dataInicialDoPeriodoAquisitivoFracionario) {
        Calculo calculo = this.getServicoDeCalculo().obterCalculoAberto();
        List<Date> datasReinicio = calculo.encontrarFaltasQueReiniciamFerias();
        if (!datasReinicio.isEmpty() && HelperDate.dateAfter(datasReinicio.get(datasReinicio.size() - 1), dataInicialDoPeriodoAquisitivoFracionario.getDate())) {
            return HelperDate.getInstance(datasReinicio.get(datasReinicio.size() - 1));
        }
        return dataInicialDoPeriodoAquisitivoFracionario;
    }

    public void calcularValorDevidoDaOcorrencia(OcorrenciaDeVerba ocorrencia) throws NegocioException {
        if (ocorrencia.getValor() != ValorDaVerbaEnum.CALCULADO) {
            return;
        }
        if (Utils.naoNulos(ocorrencia.getBase(), ocorrencia.getDivisor(), ocorrencia.getMultiplicador(), ocorrencia.getQuantidade())) {
            ocorrencia.setDevido(ocorrencia.getBase().divide(ocorrencia.getDivisor(), Utils.CONTEXTO_MATEMATICO).multiply(ocorrencia.getMultiplicador(), Utils.CONTEXTO_MATEMATICO).multiply(ocorrencia.getQuantidade(), Utils.CONTEXTO_MATEMATICO));
            if (Utils.naoNulo(ocorrencia.getDobra()) && ocorrencia.getDobra().booleanValue()) {
                ocorrencia.setDevido(ocorrencia.getDevido().multiply(VALOR_PARA_APLICAR_DOBRA, Utils.CONTEXTO_MATEMATICO));
            }
            ocorrencia.setDevido(Utils.arredondarValorMonetario(ocorrencia.getDevido()));
            BigDecimal baseParaCalculoIntegral = null;
            BigDecimal quantidadeParaCalculoIntegral = null;
            if (Utils.naoNulo(ocorrencia.getBaseIntegral()) && ocorrencia.getBaseIntegral().compareTo(ocorrencia.getBase()) != 0) {
                baseParaCalculoIntegral = ocorrencia.getBaseIntegral();
                quantidadeParaCalculoIntegral = ocorrencia.getQuantidade();
            } else {
                baseParaCalculoIntegral = ocorrencia.getBase();
                quantidadeParaCalculoIntegral = Utils.naoNulo(ocorrencia.getQuantidadeIntegral()) && ocorrencia.getQuantidadeIntegral().compareTo(ocorrencia.getQuantidade()) != 0 ? ocorrencia.getQuantidadeIntegral() : ocorrencia.getQuantidade();
            }
            if (!Utils.nulos(baseParaCalculoIntegral, quantidadeParaCalculoIntegral)) {
                ocorrencia.setDevidoIntegral(baseParaCalculoIntegral.divide(ocorrencia.getDivisor(), Utils.CONTEXTO_MATEMATICO).multiply(ocorrencia.getMultiplicador(), Utils.CONTEXTO_MATEMATICO).multiply(quantidadeParaCalculoIntegral, Utils.CONTEXTO_MATEMATICO));
                if (Utils.naoNulo(ocorrencia.getDobra()) && ocorrencia.getDobra().booleanValue()) {
                    ocorrencia.setDevidoIntegral(ocorrencia.getDevidoIntegral().multiply(VALOR_PARA_APLICAR_DOBRA, Utils.CONTEXTO_MATEMATICO));
                }
                ocorrencia.setDevidoIntegral(Utils.arredondarValorMonetario(ocorrencia.getDevidoIntegral()));
            }
        } else {
            ocorrencia.setDevido(null);
            ocorrencia.setDevidoIntegral(null);
        }
    }

    public void liquidar() throws NegocioException {
        this.iniciarExecucao();
        try {
            this.executarLiquidar();
        }
        finally {
            this.finalizarExecucao();
        }
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public boolean liquidarVerbaDrools() {
        if (this.isExecutando()) {
            return true;
        }
        this.iniciarExecucao();
        try {
            FormulaReflexo formula;
            Iterator<ItemBaseVerba> iterator;
            if (!(((VerbaDeCalculo)this.getVerba()).getFormula() instanceof FormulaInformada) && (iterator = (formula = (FormulaReflexo)((VerbaDeCalculo)this.getVerba()).getFormula()).getBaseVerba().getItens().iterator()).hasNext()) {
                ItemBaseVerba item = iterator.next();
                VerbaDeCalculo base = item.getVerbaDeCalculo();
                boolean bl = base.getMaquinaDeCalculo().liquidarVerbaDrools();
                return bl;
            }
        }
        finally {
            this.finalizarExecucao();
        }
        return false;
    }

    private void executarLiquidar() throws NegocioException {
        FormulaReflexo formula;
        this.modo = ModoDeCalculoEnum.LIQUIDACAO;
        CalculoDaBase calculoDaBase = new FormaPadrao();
        if (((VerbaDeCalculo)this.getVerba()).getFormula() instanceof FormulaReflexo && !(formula = (FormulaReflexo)((VerbaDeCalculo)this.getVerba()).getFormula()).getBaseVerba().getItens().isEmpty()) {
            calculoDaBase = new FormaPrecedenciaDeBases();
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = ((VerbaDeCalculo)this.getVerba()).getTabelaDeCorrecaoMonetariaTrabalhista();
        tabelaDeCorrecaoMonetaria.setOcorrenciaDePagamento(((VerbaDeCalculo)this.getVerba()).getOcorrenciaDePagamento());
        ParametroDoTermo parametro = new ParametroDoTermo(((VerbaDeCalculo)this.getVerba()).getCalculo(), (VerbaDeCalculo)this.getVerba(), null, this.getModo(), FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO, null, null);
        for (OcorrenciaDeVerba ocorrencia : ((VerbaDeCalculo)this.getVerba()).getOcorrenciasAtivas()) {
            parametro.setValorIntegral(null);
            Periodo periodo = new Periodo(ocorrencia.getDataInicial(), ocorrencia.getDataFinal());
            parametro.setPeriodo(periodo);
            Periodo periodoAquisitivo = new Periodo(ocorrencia.getDataInicialPeriodoAquisitivo(), ocorrencia.getDataFinalPeriodoAquisitivo());
            parametro.setPeriodoAquisitivo(periodoAquisitivo);
            parametro.setFeriasIndenizadas(ocorrencia.isFeriasIndenizadas());
            BigDecimal valorDaBase = calculoDaBase.efetuar(parametro);
            BigDecimal valorDaBaseIntegral = null;
            if (parametro.isProporcionalizado()) {
                valorDaBaseIntegral = parametro.getValorIntegral();
            }
            if (ocorrencia.isFeriasComAbono().booleanValue() && ocorrencia.getVerbaDeCalculo().getTipoValor().equals((Object)ValorDaVerbaEnum.CALCULADO)) {
                BigDecimal fatorAbono = ocorrencia.calcularFatorAbono();
                valorDaBase = valorDaBase.multiply(fatorAbono, Utils.CONTEXTO_MATEMATICO);
                if (Utils.naoNulo(valorDaBaseIntegral)) {
                    valorDaBaseIntegral = valorDaBaseIntegral.multiply(fatorAbono, Utils.CONTEXTO_MATEMATICO);
                }
            }
            ocorrencia.setBase(Utils.arredondarValorMonetario(valorDaBase));
            ocorrencia.setBaseIntegral(Utils.arredondarValorMonetario(valorDaBaseIntegral));
            this.calcularValorDevidoDaOcorrencia(ocorrencia);
            ocorrencia.setIndiceAcumulado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(periodo.getInicial()));
        }
    }

    private void criarOcorrencia(Periodo periodo) {
        this.criarOcorrenciaComPeriodoAquisitivo(periodo, null);
    }

    private void criarOcorrenciaComPeriodoAquisitivo(Periodo periodo, Periodo periodoAquisitivo) {
        this.criarOcorrenciaComPeriodoAquisitivo(periodo, periodoAquisitivo, false);
    }

    private void criarOcorrenciaComPeriodoAquisitivo(Periodo periodo, Periodo periodoAquisitivo, boolean dobraObrigatoria) {
        this.criarOcorrenciaComPeriodoAquisitivo(periodo, periodoAquisitivo, dobraObrigatoria, false);
    }

    private void criarOcorrenciaComPeriodoAquisitivo(Periodo periodo, Periodo periodoAquisitivo, boolean dobraObrigatoria, boolean ocorrenciaDeFeriasIndenizadas) {
        this.criarOcorrenciaComPeriodoAquisitivo(periodo, periodoAquisitivo, dobraObrigatoria, ocorrenciaDeFeriasIndenizadas, false);
    }

    private void criarOcorrenciaComPeriodoAquisitivo(Periodo periodo, Periodo periodoAquisitivo, boolean dobraObrigatoria, boolean ocorrenciaDeFeriasIndenizadas, boolean ocorrenciaDeFeriasComAbono) {
        ParametroDoTermo parametro = new ParametroDoTermo(((VerbaDeCalculo)this.getVerba()).getCalculo(), (VerbaDeCalculo)this.getVerba(), periodo, this.getModo(), FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO, periodoAquisitivo, null);
        OcorrenciaDeVerba ocorrencia = new OcorrenciaDeVerba();
        ocorrencia.setDataInicial(periodo.getInicial());
        ocorrencia.setDataFinal(periodo.getFinal());
        ocorrencia.setCaracteristica(((VerbaDeCalculo)this.verba).getCaracteristica());
        ocorrencia.setOcorrenciaDePagamento(((VerbaDeCalculo)this.verba).getOcorrenciaDePagamento());
        ocorrencia.setComporPrincipal(((VerbaDeCalculo)this.verba).getComporPrincipal());
        ocorrencia.setValor(((VerbaDeCalculo)this.verba).getTipoValor());
        ocorrencia.setBase(this.obterValorDaBase(parametro));
        ocorrencia.setDivisor(this.obterValorDoDivisor(parametro));
        if (Utils.naoNulo(ocorrencia.getDivisor()) && BigDecimal.ZERO.compareTo(ocorrencia.getDivisor()) == 0) {
            ocorrencia.setAtivo(Boolean.FALSE);
        }
        ocorrencia.setMultiplicador(this.obterValorDoMultiplicador(parametro));
        BigDecimal quantidade = this.obterQuantidade(parametro);
        ocorrencia.setQuantidade(quantidade);
        if (parametro.isProporcionalizado()) {
            ocorrencia.setQuantidadeIntegral(parametro.getValorIntegral());
            parametro.setValorIntegral(null);
        } else {
            int diasParaExcluir = 0;
            if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterDiasFerias(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                diasParaExcluir = 1;
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() <= diasParaExcluir) {
                diasParaExcluir = 0;
            }
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(parametro.getPeriodo(), quantidade, diasParaExcluir);
            integralizar.executar();
            ocorrencia.setQuantidadeIntegral(integralizar.getResultado());
        }
        BigDecimal devido = this.obterValorDevido(parametro);
        ocorrencia.setDevido(Utils.arredondarValorMonetario(devido));
        if (parametro.isProporcionalizado()) {
            ocorrencia.setDevidoIntegral(parametro.getValorIntegral());
            parametro.setValorIntegral(null);
        } else {
            int diasParaExcluir = 0;
            if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterDiasFerias(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                diasParaExcluir = 1;
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() <= diasParaExcluir) {
                diasParaExcluir = 0;
            }
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(parametro.getPeriodo(), devido, diasParaExcluir);
            integralizar.executar();
            ocorrencia.setDevidoIntegral(integralizar.getResultado());
        }
        parametro.setFase(FaseDoCalculoEnum.CALCULANDO_VALOR_PAGO);
        BigDecimal valorPago = this.obterValorPago(parametro);
        ocorrencia.setPago(Utils.arredondarValorMonetario(valorPago));
        if (parametro.isProporcionalizado()) {
            ocorrencia.setPagoIntegral(parametro.getValorIntegral());
            parametro.setValorIntegral(null);
        } else {
            int diasParaExcluir = 0;
            if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterDiasFerias(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                diasParaExcluir = 1;
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() <= diasParaExcluir) {
                diasParaExcluir = 0;
            }
            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(parametro.getPeriodo(), valorPago, diasParaExcluir);
            integralizar.executar();
            ocorrencia.setPagoIntegral(integralizar.getResultado());
        }
        ocorrencia.setDobra(this.obterDobra());
        if (dobraObrigatoria) {
            ocorrencia.setDobra(true);
        }
        if (periodoAquisitivo != null) {
            ocorrencia.setDataInicialPeriodoAquisitivo(periodoAquisitivo.getInicial());
            ocorrencia.setDataFinalPeriodoAquisitivo(periodoAquisitivo.getFinal());
        }
        ocorrencia.setFeriasIndenizadas(ocorrenciaDeFeriasIndenizadas);
        ocorrencia.setFeriasComAbono(ocorrenciaDeFeriasComAbono);
        ocorrencia.setVerbaDeCalculo((VerbaDeCalculo)this.verba);
        ocorrencia.calcularValorDevido();
        OcorrenciaDeVerba original = ocorrencia.clonar();
        ocorrencia.setOcorrenciaOriginal(original);
        ((VerbaDeCalculo)this.verba).adicionarEmOcorrencias(ocorrencia);
    }

    private void iniciarExecucao() {
        this.executando = true;
    }

    public boolean isExecutando() {
        return this.executando;
    }

    private void finalizarExecucao() {
        this.executando = false;
    }

    protected abstract BigDecimal obterValorDaBase(ParametroDoTermo var1);

    protected abstract BigDecimal obterValorDoDivisor(ParametroDoTermo var1);

    protected abstract BigDecimal obterValorDoMultiplicador(ParametroDoTermo var1);

    protected abstract BigDecimal obterQuantidade(ParametroDoTermo var1);

    protected abstract BigDecimal obterValorDevido(ParametroDoTermo var1);

    protected abstract BigDecimal obterValorPago(ParametroDoTermo var1);

    protected abstract Boolean obterDobra();

    public T getVerba() {
        return this.verba;
    }

    public void setVerba(T verba) {
        this.verba = verba;
    }

    public ModoDeCalculoEnum getModo() {
        return this.modo;
    }

    public void setModo(ModoDeCalculoEnum fase) {
        this.modo = fase;
    }

    class FormaPadrao
    implements CalculoDaBase {
        FormaPadrao() {
        }

        @Override
        public BigDecimal efetuar(ParametroDoTermo parametro) {
            return MaquinaDeCalculo.this.obterValorDaBase(parametro);
        }
    }

    class FormaPrecedenciaDeBases
    implements CalculoDaBase {
        FormaPrecedenciaDeBases() {
        }

        @Override
        public BigDecimal efetuar(ParametroDoTermo parametro) {
            return MaquinaDeCalculo.this.obterValorDaBase(parametro);
        }
    }

    static interface CalculoDaBase {
        public BigDecimal efetuar(ParametroDoTermo var1);
    }
}

