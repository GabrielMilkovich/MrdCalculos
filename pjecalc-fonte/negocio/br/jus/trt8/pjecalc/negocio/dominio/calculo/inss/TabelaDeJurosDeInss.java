/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss.JurosSelicInss;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public abstract class TabelaDeJurosDeInss
extends TabelaDeJuros {
    private static final int QTD_MESES_SEM_TAXA_APLICADA_AINDA = 2;
    private static final BigDecimal TAXA_JA_APLICADA_REMOVIDA = BigDecimal.ONE;
    private static final long serialVersionUID = 1L;
    private Map<Date, BigDecimal> tabelaSelic;
    private Boolean ocorrenciaAntesDaLei;

    public TabelaDeJurosDeInss(Calculo calculo, Date dataInicialParaCalculo) {
        super(calculo);
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo);
    }

    public TabelaDeJurosDeInss(Calculo calculo, Date dataInicialParaCalculo, Date dataFinalParaCalculo, Boolean ocorrenciaAntesDaLei) {
        super(calculo, dataInicialParaCalculo, dataFinalParaCalculo);
        this.ocorrenciaAntesDaLei = ocorrenciaAntesDaLei;
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo, dataFinalParaCalculo, ocorrenciaAntesDaLei);
    }

    protected abstract boolean isUsarJurosSelic();

    protected abstract boolean isUsarJurosBasico();

    protected abstract Date getDataLimiteParaJurosBasico();

    protected boolean isUsarJurosSelicEBasico() {
        return this.isUsarJurosBasico() && this.isUsarJurosSelic() || this.isUsarJurosSelic() && Utils.naoNulo(this.getDataLimiteParaJurosBasico());
    }

    private void carregarTabelaDeJurosSelic(Date dataInicialParaCalculo) {
        this.carregarTabelaDeJurosSelic(dataInicialParaCalculo, this.getCalculo().getDataDeLiquidacao(), Boolean.FALSE);
    }

    private void carregarTabelaDeJurosSelic(Date dataInicialParaCalculo, Date dataFinalParaCalculo, Boolean ocorrenciaAntesDaLei) {
        List<JurosSelicInss> listaDeJurosSelic;
        if (!(this.isUsarJurosSelic() || this.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() || this.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue())) {
            return;
        }
        this.tabelaSelic = new LinkedHashMap<Date, BigDecimal>();
        BigDecimal taxaAcumulada = BigDecimal.ZERO;
        HelperDate dataCorrente = HelperDate.getInstance(dataFinalParaCalculo).setDay(1);
        dataCorrente.removeTime();
        this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
        this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
        HelperDate hdDataInicialParaCalculo = HelperDate.getInstance(dataInicialParaCalculo).setDay(1);
        hdDataInicialParaCalculo.removeTime();
        HelperDate hdDataLimiteJurosBasico = hdDataInicialParaCalculo;
        if (this.isUsarJurosSelicEBasico()) {
            hdDataLimiteJurosBasico = HelperDate.getInstance(this.getDataLimiteParaJurosBasico()).setDay(1);
        }
        boolean ocorrenciaDevidoDepoisDaLei = HelperDate.dateAfterOrEquals(dataInicialParaCalculo, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).addMonth(-1).getDate());
        if (this.getCalculo().isCalculoExterno().booleanValue()) {
            ocorrenciaDevidoDepoisDaLei = ocorrenciaAntesDaLei == false;
        }
        boolean ocorrenciaPagoDepoisDaLei = HelperDate.dateAfterOrEquals(dataInicialParaCalculo, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).addMonth(-1).getDate());
        if (this.getCalculo().isCalculoExterno().booleanValue()) {
            boolean bl = ocorrenciaPagoDepoisDaLei = ocorrenciaAntesDaLei == false;
        }
        if (this.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() && ocorrenciaDevidoDepoisDaLei) {
            taxaAcumulada = BigDecimal.ONE;
            this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            listaDeJurosSelic = JurosSelicInss.obterTodosPorPeriodo(HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).getDate(), dataCorrente.getDate());
            for (JurosSelicInss jurosSelicInss : listaDeJurosSelic) {
                while (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(jurosSelicInss.getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataCorrente.getDate()).getDate())) {
                    this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
                }
                taxaAcumulada = taxaAcumulada.add(jurosSelicInss.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                dataCorrente.setDate(jurosSelicInss.getCompetencia());
                dataCorrente.removeTime();
                this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            }
        } else if (this.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && ocorrenciaPagoDepoisDaLei) {
            taxaAcumulada = BigDecimal.ONE;
            this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            listaDeJurosSelic = JurosSelicInss.obterTodosPorPeriodo(HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).getDate(), dataCorrente.getDate());
            for (JurosSelicInss jurosSelicInss : listaDeJurosSelic) {
                while (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(jurosSelicInss.getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataCorrente.getDate()).getDate())) {
                    this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
                }
                taxaAcumulada = taxaAcumulada.add(jurosSelicInss.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                dataCorrente.setDate(jurosSelicInss.getCompetencia());
                dataCorrente.removeTime();
                this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            }
        } else if (HelperDate.dateBeforeOrEquals(hdDataLimiteJurosBasico.getDate(), dataCorrente.getDate())) {
            taxaAcumulada = BigDecimal.ONE;
            this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            listaDeJurosSelic = JurosSelicInss.obterTodosPorPeriodo(hdDataLimiteJurosBasico.getDate(), dataCorrente.getDate());
            for (JurosSelicInss jurosSelicInss : listaDeJurosSelic) {
                while (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(jurosSelicInss.getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataCorrente.getDate()).getDate())) {
                    this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
                }
                taxaAcumulada = taxaAcumulada.add(jurosSelicInss.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                dataCorrente.setDate(jurosSelicInss.getCompetencia());
                dataCorrente.removeTime();
                this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
            }
        } else {
            this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
        }
        List<Periodo> periodosFixos = HelperDate.breakInMonths(hdDataInicialParaCalculo.getDate(), dataCorrente.getDate());
        for (int i = periodosFixos.size() - 1; i >= 0; --i) {
            Periodo periodo = periodosFixos.get(i);
            dataCorrente.setDate(periodo.getInicial());
            dataCorrente.removeTime();
            this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
        }
    }

    private void registrarValorDeJurosDoMesNaTabela(BigDecimal taxaAcumulada, HelperDate dataCorrente) {
        this.tabelaSelic.put(dataCorrente.getDate(), taxaAcumulada);
        dataCorrente.addMonth(-1);
    }

    protected BigDecimal calcularTaxaDeJurosSelic(Date data) {
        if (this.getCalculo().isCalculoExterno().booleanValue()) {
            return this.calcularTaxaDeJurosSelicParaCalculoExterno(data);
        }
        HelperDate hdData = HelperDate.getInstance(data);
        hdData.removeTime();
        return this.tabelaSelic.get(hdData.getDate());
    }

    private BigDecimal calcularTaxaDeJurosSelicParaCalculoExterno(Date data) {
        boolean removerTaxaAplicada = true;
        HelperDate hdData = HelperDate.getInstance(data).addMonth(-2);
        if (Utils.naoNulo(this.getDataLimiteParaJurosBasico())) {
            HelperDate mesPosteriorADataLimite = HelperDate.getInstance(this.getDataLimiteParaJurosBasico()).addMonth(1).setDay(1);
            if (HelperDate.dateBefore(hdData.getDate(), mesPosteriorADataLimite.getDate()) && Boolean.TRUE.equals(this.ocorrenciaAntesDaLei)) {
                hdData = mesPosteriorADataLimite;
                removerTaxaAplicada = false;
            }
        }
        hdData.removeTime();
        BigDecimal taxa = this.tabelaSelic.get(hdData.getDate());
        if (removerTaxaAplicada) {
            taxa = Utils.subtrair(taxa, TAXA_JA_APLICADA_REMOVIDA);
        }
        return taxa;
    }

    protected BigDecimal calcularTaxaDeJurosSelicEBasico(Date data, Boolean isAtualizacao) {
        HelperDate hdData = HelperDate.getInstance(data);
        if (hdData.greaterThen(this.getDataLimiteParaJurosBasico())) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        BigDecimal selic = (BigDecimal)Utils.seNulo(this.calcularTaxaDeJurosSelic(data), BigDecimal.ZERO);
        BigDecimal padrao = BigDecimal.ZERO;
        if (this.isUsarJurosBasico() && isAtualizacao.booleanValue()) {
            padrao = (BigDecimal)Utils.seNulo(super.calcularTaxaDeJurosDaAtualizacao(data), BigDecimal.ZERO);
        } else if (this.isUsarJurosBasico()) {
            padrao = (BigDecimal)Utils.seNulo(super.calcularTaxaDeJuros(data), BigDecimal.ZERO);
        }
        return Utils.somar(selic, padrao);
    }

    @Override
    public BigDecimal calcularTaxaDeJuros(Date data) {
        if (Utils.naoNulo(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()) && this.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() && HelperDate.dateAfterOrEquals(data, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).getDate())) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        if (Utils.naoNulo(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()) && this.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && HelperDate.dateAfterOrEquals(data, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).getDate())) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        if (this.isUsarJurosSelicEBasico()) {
            return this.calcularTaxaDeJurosSelicEBasico(data, Boolean.FALSE);
        }
        if (this.isUsarJurosBasico()) {
            return super.calcularTaxaDeJuros(data);
        }
        if (this.isUsarJurosSelic()) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        return null;
    }

    public BigDecimal calcularTaxaDeJurosDaAtualizacao(Date data, Boolean ocorrenciaAntesDaLei) {
        Boolean ocorrenciaDepoisDaLei = HelperDate.dateAfterOrEquals(data, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()).getDate());
        if (this.getCalculo().isCalculoExterno().booleanValue()) {
            ocorrenciaDepoisDaLei = ocorrenciaAntesDaLei == false;
        }
        if (Utils.naoNulo(this.getCalculo().getInss().getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()) && this.getCalculo().getParametrosDeAtualizacao().getLei11941().booleanValue() && ocorrenciaDepoisDaLei.booleanValue()) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        ocorrenciaDepoisDaLei = HelperDate.dateAfterOrEquals(data, HelperDate.getCurrentCompetence(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()).getDate());
        if (this.getCalculo().isCalculoExterno().booleanValue()) {
            ocorrenciaDepoisDaLei = ocorrenciaAntesDaLei == false;
        }
        if (Utils.naoNulo(this.getCalculo().getInss().getInssSobreSalariosPagos().getDataLimiteCorrecao11941()) && this.getCalculo().getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && ocorrenciaDepoisDaLei.booleanValue()) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        if (this.isUsarJurosSelicEBasico()) {
            return this.calcularTaxaDeJurosSelicEBasico(data, Boolean.TRUE);
        }
        if (this.isUsarJurosBasico()) {
            return super.calcularTaxaDeJurosDaAtualizacao(data);
        }
        if (this.isUsarJurosSelic()) {
            return this.calcularTaxaDeJurosSelic(data);
        }
        return null;
    }
}

