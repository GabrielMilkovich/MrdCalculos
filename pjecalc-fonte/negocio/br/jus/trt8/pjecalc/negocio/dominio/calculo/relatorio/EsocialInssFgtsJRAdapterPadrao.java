/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.RepositorioDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialInssFgtsUtils;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class EsocialInssFgtsJRAdapterPadrao
extends EsocialInssFgtsJRAdapter {
    private static final String COMPETENCIA_INICIO = "Compet\u00eancia In\u00edcio";
    private static final String COMPETENCIA_FIM = "Compet\u00eancia Fim";
    private static final String VALOR_REMUNERATORIO = "Valor Remunerat\u00f3rio";
    private static final String VALOR_AVISO_PREVIO = "Valor Aviso Pr\u00e9vio Indenizado";
    private static final String VALOR_DECIMO_AVOS = "Valor 13\u00ba Sal\u00e1rio Avos API";
    private static final String VALOR_INDENIZATORIO = "Valor Indenizat\u00f3rio";
    private Calculo calculo;
    private EsocialInssFgtsJRAdapter.ItensEventoS2500Appender appender = new EsocialInssFgtsJRAdapter.ItensEventoS2500Appender();
    private Date competenciaInicio;
    private Date competenciaFim;
    private BigDecimal valorRemuneratorioInss = BigDecimal.ZERO;
    private BigDecimal valorRemuneratorioFgts = BigDecimal.ZERO;
    private BigDecimal valorBaseAvisoPrevioInss = BigDecimal.ZERO;
    private BigDecimal valorBaseAvisoPrevioInssComIncidencia = BigDecimal.ZERO;
    private BigDecimal valorBaseAvisoPrevioFgts = BigDecimal.ZERO;
    private BigDecimal valorDecimoAvosProjecaoInss = BigDecimal.ZERO;
    private BigDecimal valorDecimoAvosProjecaoFgts = BigDecimal.ZERO;
    private Map<Date, BigDecimal> baseCalculoInss = new HashMap<Date, BigDecimal>();
    private Map<Date, BigDecimal> baseCalculoDecimoInss = new HashMap<Date, BigDecimal>();
    private Map<Date, BigDecimal> baseCalculoFgts = new HashMap<Date, BigDecimal>();
    private Map<Date, BigDecimal> baseCalculoDecimoFgts = new HashMap<Date, BigDecimal>();

    public EsocialInssFgtsJRAdapterPadrao() {
    }

    public EsocialInssFgtsJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
        this.competenciaInicio = HelperDate.getCurrentCompetence(Utils.naoNulo(this.calculo.getDataInicioCalculo()) ? this.calculo.getDataInicioCalculo() : this.calculo.getDataAdmissao()).getDate();
        this.competenciaFim = HelperDate.getCurrentCompetence(Utils.naoNulo(this.calculo.getDataTerminoCalculo()) ? this.calculo.getDataTerminoCalculo() : this.calculo.getDataDemissao()).getDate();
        this.popularItensEvento();
    }

    private void popularItensEvento() {
        this.popularInformacoesDetalhadas();
        this.popularInformacoesGerais();
    }

    private void popularInformacoesDetalhadas() {
        BigDecimal previo;
        Date competencia;
        this.encontrarBaseAvisoPrevioInss();
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDeInssSobreSalariosDevidos : this.calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba()) {
            BigDecimal parcelaBase;
            competencia = HelperDate.getCurrentCompetence(ocorrenciaDeInssSobreSalariosDevidos.getDataOcorrenciaInss()).getDate();
            if (!ocorrenciaDeInssSobreSalariosDevidos.getOcorrenciaDecimoTerceiro().booleanValue() && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateEquals(competencia, HelperDate.getCurrentCompetence(this.calculo.getDataDemissao()).getDate())) {
                parcelaBase = Utils.somar(ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas(), this.baseCalculoInss.get(competencia), ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas());
                parcelaBase = Utils.subtrair(parcelaBase, this.valorBaseAvisoPrevioInssComIncidencia, parcelaBase);
                this.baseCalculoInss.put(competencia, parcelaBase);
            } else if (!ocorrenciaDeInssSobreSalariosDevidos.getOcorrenciaDecimoTerceiro().booleanValue()) {
                parcelaBase = Utils.somar(ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas(), this.baseCalculoInss.get(competencia), ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas());
                this.baseCalculoInss.put(competencia, parcelaBase);
            } else {
                this.encontrarDecimoSemProjecao(ocorrenciaDeInssSobreSalariosDevidos.getDataInicioPeriodo(), ocorrenciaDeInssSobreSalariosDevidos.getDataTerminoPeriodo(), ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas(), TipoVerbaEnum.INSS);
                parcelaBase = Utils.somar(ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas(), this.baseCalculoDecimoInss.get(competencia), ocorrenciaDeInssSobreSalariosDevidos.getValorBaseVerbas());
                this.baseCalculoDecimoInss.put(competencia, parcelaBase);
            }
            this.valorRemuneratorioInss = Utils.somar(this.valorRemuneratorioInss, parcelaBase, this.valorRemuneratorioInss);
        }
        for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaDeInssSobreSalariosPagos : this.calculo.getInss().getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos()) {
            competencia = HelperDate.getCurrentCompetence(ocorrenciaDeInssSobreSalariosPagos.getDataOcorrenciaInss()).getDate();
            if (!ocorrenciaDeInssSobreSalariosPagos.getOcorrenciaDecimoTerceiro().booleanValue()) {
                previo = this.baseCalculoInss.get(competencia);
                this.baseCalculoInss.put(competencia, Utils.somar(ocorrenciaDeInssSobreSalariosPagos.getValorBase(), previo, ocorrenciaDeInssSobreSalariosPagos.getValorBase()));
                continue;
            }
            this.encontrarDecimoSemProjecao(ocorrenciaDeInssSobreSalariosPagos.getDataInicioPeriodo(), ocorrenciaDeInssSobreSalariosPagos.getDataTerminoPeriodo(), ocorrenciaDeInssSobreSalariosPagos.getValorBase(), TipoVerbaEnum.INSS);
            previo = this.baseCalculoDecimoInss.get(competencia);
            this.baseCalculoDecimoInss.put(competencia, Utils.somar(ocorrenciaDeInssSobreSalariosPagos.getValorBase(), previo, ocorrenciaDeInssSobreSalariosPagos.getValorBase()));
        }
        this.encontrarBasesDecimoFGTS();
        for (OcorrenciaDeFgts ocorrenciaDeFgts : this.calculo.getFgts().getOcorrencias()) {
            competencia = HelperDate.getCurrentCompetence(ocorrenciaDeFgts.getOcorrencia()).getDate();
            previo = this.baseCalculoFgts.get(competencia);
            BigDecimal decimoTerceiro = this.baseCalculoDecimoFgts.get(competencia);
            BigDecimal baseCalculoFgtsCompetencia = Utils.somar(ocorrenciaDeFgts.getSomaDasBases(Boolean.TRUE), previo, ocorrenciaDeFgts.getSomaDasBases(Boolean.TRUE));
            BigDecimal baseVerbaFgtsCompetencia = Utils.somar(ocorrenciaDeFgts.getBaseVerbaSemAvisoPrevio(), previo, ocorrenciaDeFgts.getBaseVerbaSemAvisoPrevio());
            baseCalculoFgtsCompetencia = Utils.subtrair(baseCalculoFgtsCompetencia, decimoTerceiro, baseCalculoFgtsCompetencia);
            baseVerbaFgtsCompetencia = Utils.subtrair(baseVerbaFgtsCompetencia, decimoTerceiro, baseVerbaFgtsCompetencia);
            if (Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateEquals(competencia, HelperDate.getCurrentCompetence(this.calculo.getDataDemissao()).getDate())) {
                baseVerbaFgtsCompetencia = Utils.subtrair(baseVerbaFgtsCompetencia, this.valorDecimoAvosProjecaoFgts, baseVerbaFgtsCompetencia);
                this.valorBaseAvisoPrevioFgts = Utils.somar(this.valorBaseAvisoPrevioFgts, Utils.subtrair(ocorrenciaDeFgts.getBaseVerba(), ocorrenciaDeFgts.getBaseVerbaSemAvisoPrevio()), this.valorBaseAvisoPrevioFgts);
                baseCalculoFgtsCompetencia = Utils.somar(baseCalculoFgtsCompetencia, this.valorBaseAvisoPrevioFgts, baseCalculoFgtsCompetencia);
            }
            this.baseCalculoFgts.put(competencia, baseCalculoFgtsCompetencia);
            this.valorRemuneratorioFgts = Utils.somar(this.valorRemuneratorioFgts, baseVerbaFgtsCompetencia, this.valorRemuneratorioFgts);
        }
        Date dataAuxiliar = this.competenciaInicio;
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar, this.competenciaFim)) {
            BigDecimal bigDecimal = Utils.naoNulo(this.baseCalculoInss.get(dataAuxiliar)) ? this.baseCalculoInss.get(dataAuxiliar) : BigDecimal.ZERO;
            BigDecimal baseDecimoInss = Utils.naoNulo(this.baseCalculoDecimoInss.get(dataAuxiliar)) ? this.baseCalculoDecimoInss.get(dataAuxiliar) : BigDecimal.ZERO;
            BigDecimal baseFgts = Utils.naoNulo(this.baseCalculoFgts.get(dataAuxiliar)) ? this.baseCalculoFgts.get(dataAuxiliar) : BigDecimal.ZERO;
            BigDecimal baseDecimoFgts = Utils.naoNulo(this.baseCalculoDecimoFgts.get(dataAuxiliar)) ? this.baseCalculoDecimoFgts.get(dataAuxiliar) : BigDecimal.ZERO;
            this.appender.append(new EsocialInssFgtsJRAdapter.ItemDetalhado(dataAuxiliar, bigDecimal, baseDecimoInss, Utils.somar(baseFgts, baseDecimoFgts), BigDecimal.ZERO));
            dataAuxiliar = HelperDate.getInstance(dataAuxiliar).addMonth(1).setDay(1).getDate();
        }
    }

    private void encontrarBaseAvisoPrevioInss() {
        Competencia competencia = new Competencia();
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (VerbaDeCalculo verba : this.calculo.getVerbasAtivas()) {
            ocorrenciasDaVerba.add(verba.getOcorrenciasAtivasOptimizerListSearch());
        }
        Date dataAuxiliar = this.competenciaInicio;
        while (HelperDate.dateBeforeOrEquals(dataAuxiliar, this.competenciaFim)) {
            if (Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataAuxiliar).getDate(), HelperDate.getCurrentCompetence(this.calculo.getDataDemissao()).getDate())) {
                competencia.update(dataAuxiliar);
                for (OptimizerListSearch optimizerListSearch : ocorrenciasDaVerba) {
                    Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerListSearch.search(competencia);
                    BigDecimal[] valoresBase = EsocialInssFgtsUtils.calcularValoresBaseInss(ocorrenciasDeVerba);
                    this.valorBaseAvisoPrevioInss = Utils.somar(this.valorBaseAvisoPrevioInss, valoresBase[0], this.valorBaseAvisoPrevioInss);
                    this.valorBaseAvisoPrevioInssComIncidencia = Utils.somar(this.valorBaseAvisoPrevioInssComIncidencia, valoresBase[1], this.valorBaseAvisoPrevioInssComIncidencia);
                }
            }
            dataAuxiliar = HelperDate.getInstance(dataAuxiliar).addMonth(1).setDay(1).getDate();
        }
    }

    /*
     * WARNING - void declaration
     */
    private void encontrarBasesDecimoFGTS() {
        void var4_7;
        Competencia competencia = new Competencia();
        ArrayList<VerbaDeCalculo> verbas = new ArrayList<VerbaDeCalculo>();
        for (VerbaDeCalculo verbaDeCalculo : this.calculo.getVerbasAtivas()) {
            if (!verbaDeCalculo.getIncidenciaFGTS().booleanValue()) continue;
            verbas.add(verbaDeCalculo);
        }
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (VerbaDeCalculo verbaDeCalculo : verbas) {
            ocorrenciasDaVerba.add(verbaDeCalculo.getOcorrenciasAtivasOptimizerListSearch());
        }
        Date date = this.competenciaInicio;
        while (HelperDate.dateBeforeOrEquals((Date)var4_7, this.competenciaFim)) {
            if (HelperDate.getInstance((Date)var4_7).getMonth() == 11 || Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence((Date)var4_7).getDate(), HelperDate.getCurrentCompetence(this.calculo.getDataDemissao()).getDate())) {
                void var5_12;
                competencia.update((Date)var4_7);
                if (Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateAfter(HelperDate.getCurrentCompetence((Date)var4_7).getDate(), this.calculo.getDataDemissao())) break;
                BigDecimal bigDecimal = BigDecimal.ZERO;
                for (OptimizerListSearch optimizerListSearch : ocorrenciasDaVerba) {
                    Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerListSearch.search(competencia);
                    BigDecimal bigDecimal2 = Utils.somar((BigDecimal)var5_12, EsocialInssFgtsUtils.calcularValoresBaseFGTS(ocorrenciasDeVerba), (BigDecimal)var5_12);
                }
                BigDecimal valorBaseFGTSCompetenciaSemProjecao = this.encontrarDecimoSemProjecao(HelperDate.getCurrentCompetence((Date)var4_7).getDate(), HelperDate.getCurrentCompetence((Date)var4_7).lastDayOfTheMonth().getDate(), (BigDecimal)var5_12, TipoVerbaEnum.FGTS);
                this.baseCalculoDecimoFgts.put(HelperDate.getCurrentCompetence((Date)var4_7).getDate(), (BigDecimal)var5_12);
                this.valorRemuneratorioFgts = Utils.somar(this.valorRemuneratorioFgts, valorBaseFGTSCompetenciaSemProjecao, this.valorRemuneratorioFgts);
            }
            Date date2 = HelperDate.getInstance((Date)var4_7).addMonth(1).setDay(1).getDate();
        }
    }

    private BigDecimal encontrarDecimoSemProjecao(Date dataInicioOcorrencia, Date dataFimOcorrencia, BigDecimal valorBase, TipoVerbaEnum tipo) {
        int avos;
        BigDecimal baseDecimoSemProjecao = valorBase;
        if (this.calculo.getProjetaAvisoIndenizado().booleanValue() && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateAfterOrEquals(dataFimOcorrencia, this.calculo.getDataDemissao()) && (avos = RepositorioDeInss.calculaAvosInssDecimoTerceiro(this.calculo, new Periodo(dataInicioOcorrencia, dataFimOcorrencia))) > 0) {
            HelperDate dataDemissao = HelperDate.getInstance(this.calculo.getDataDemissao());
            int avosSemProjecao = dataDemissao.getMonth();
            int dia14 = 14;
            if (HelperDate.getInstance(this.calculo.getDataDemissao()).getDay() > 14) {
                ++avosSemProjecao;
            }
            baseDecimoSemProjecao = Utils.arredondarValorMonetario(Utils.multiplicar(Utils.dividir(baseDecimoSemProjecao, BigDecimal.valueOf(avos)), BigDecimal.valueOf(avosSemProjecao)));
            if (TipoVerbaEnum.INSS.equals((Object)tipo)) {
                this.valorDecimoAvosProjecaoInss = Utils.somar(this.valorDecimoAvosProjecaoInss, Utils.subtrair(valorBase, baseDecimoSemProjecao), this.valorDecimoAvosProjecaoInss);
            } else {
                this.valorDecimoAvosProjecaoFgts = Utils.somar(this.valorDecimoAvosProjecaoFgts, Utils.subtrair(valorBase, baseDecimoSemProjecao), this.valorDecimoAvosProjecaoFgts);
            }
        }
        return baseDecimoSemProjecao;
    }

    private void popularInformacoesGerais() {
        String competenciaInicio = Utils.formatarCompetencia(this.competenciaInicio);
        String competenciaFim = Utils.formatarCompetencia(this.competenciaFim);
        DecimalFormat df = new DecimalFormat("#,##0.00");
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(COMPETENCIA_INICIO, competenciaInicio, competenciaInicio));
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(COMPETENCIA_FIM, competenciaFim, competenciaFim));
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(VALOR_REMUNERATORIO, df.format(this.valorRemuneratorioInss), df.format(this.valorRemuneratorioFgts)));
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(VALOR_AVISO_PREVIO, df.format(this.valorBaseAvisoPrevioInss), df.format(this.valorBaseAvisoPrevioFgts)));
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(VALOR_DECIMO_AVOS, df.format(this.valorDecimoAvosProjecaoInss), df.format(this.valorDecimoAvosProjecaoFgts)));
        BigDecimal[] valoresIndenizatorios = EsocialInssFgtsUtils.encontrarIndenizatorioInssFgts(this.calculo);
        this.appender.append(new EsocialInssFgtsJRAdapter.ItemGeral(VALOR_INDENIZATORIO, df.format(valoresIndenizatorios[0]), df.format(valoresIndenizatorios[1])));
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<EsocialInssFgtsJRAdapter.OcorrenciaGeralEventoS2500Adapter> getInformacoesGeraisEventoS2500() {
        return new JRAdapterDataSource<EsocialInssFgtsJRAdapter.OcorrenciaGeralEventoS2500Adapter>(new OcorrenciaGeralEventoS2500AdapterPadrao(), this.appender.getItensInformacoesGerais());
    }

    @Override
    public JRAdapterDataSource<EsocialInssFgtsJRAdapter.OcorrenciaDetalhadaEventoS2500Adapter> getInformacoesDetalhadasEventoS2500() {
        return new JRAdapterDataSource<EsocialInssFgtsJRAdapter.OcorrenciaDetalhadaEventoS2500Adapter>(new OcorrenciaDetalhadaEventoS2500AdapterPadrao(), this.appender.getItensInformacoesDetalhadas());
    }

    public class OcorrenciaDetalhadaEventoS2500AdapterPadrao
    extends EsocialInssFgtsJRAdapter.OcorrenciaDetalhadaEventoS2500Adapter {
        private EsocialInssFgtsJRAdapter.ItemDetalhado item;

        @Override
        public OcorrenciaDetalhadaEventoS2500AdapterPadrao adapt(Object adapted) {
            this.item = (EsocialInssFgtsJRAdapter.ItemDetalhado)adapted;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.item.getOcorrencia();
        }

        @Override
        public String getValorBaseCalculoINSS() {
            return this.item.getValorBaseCalculoINSSFormatado();
        }

        @Override
        public String getValorBaseDecimoINSS() {
            return this.item.getValorBaseDecimoINSSFormatado();
        }

        @Override
        public String getValorBaseCalculoFGTS() {
            return this.item.getValorBaseCalculoFGTSFormatado();
        }

        @Override
        public String getValorBaseDecimoFGTS() {
            return this.item.getValorBaseDecimoFGTSFormatado();
        }
    }

    public class OcorrenciaGeralEventoS2500AdapterPadrao
    extends EsocialInssFgtsJRAdapter.OcorrenciaGeralEventoS2500Adapter {
        private EsocialInssFgtsJRAdapter.ItemGeral item;

        @Override
        public OcorrenciaGeralEventoS2500AdapterPadrao adapt(Object adapted) {
            this.item = (EsocialInssFgtsJRAdapter.ItemGeral)adapted;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getDescricao();
        }

        @Override
        public String getValorContribuicaoSocial() {
            return this.item.getValorContribuicaoSocial();
        }

        @Override
        public String getValorFGTS() {
            return this.item.getValorFGTS();
        }
    }

    private static enum TipoVerbaEnum {
        FGTS,
        INSS;

    }
}

