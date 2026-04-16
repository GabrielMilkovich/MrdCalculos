/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.PeriodoDeJuros;
import br.jus.trt8.pjecalc.negocio.comum.TabelaDeJuros;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.math.BigDecimal;
import java.util.Date;

public class TabelaDeJurosDoCalculo
extends TabelaDeJuros {
    private static final long serialVersionUID = 1L;
    private Date dataInicialDeJuros;
    private JurosDoAjuizamentoEnum jurosDoAjuizamento;
    private Periodo periodoDeJurosPadrao;
    private Periodo periodoDeJurosFazendaPublica;
    private boolean periodoDeJurosCalculado = false;

    public TabelaDeJurosDoCalculo(Calculo calculo) {
        super(calculo);
    }

    public TabelaDeJurosDoCalculo(Calculo calculo, Date dataInicialParaCalculo, Date dataFinalParaCalculo) {
        super(calculo, dataInicialParaCalculo, dataFinalParaCalculo);
    }

    @Override
    protected JurosDoAjuizamentoEnum getTipoDeJurosDoAjuizamento() {
        if (Utils.nulo((Object)this.jurosDoAjuizamento)) {
            return super.getTipoDeJurosDoAjuizamento();
        }
        return this.jurosDoAjuizamento;
    }

    @Override
    protected Date calcularDataInicialDoPrimeiroPeriodoDeJuros(Date dataInicialParaCalculo, Date dataFimVencimentoOcorrencia) {
        if (JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS.equals((Object)this.getTipoDeJurosDoAjuizamento())) {
            HelperDate dataInicial = HelperDate.getInstance(dataInicialParaCalculo).lastDayOfTheMonth();
            if (this.getCalculo().getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial().booleanValue()) {
                Date dataAux = dataFimVencimentoOcorrencia;
                if (Utils.nulo(dataAux)) {
                    dataAux = dataInicial.getDate();
                }
                this.dataInicialDeJuros = dataAux;
                return HelperDate.getInstance(dataAux).addDay(1).getDate();
            }
            if (Utils.nulo(this.getCalculo().getDataAjuizamento()) || dataInicial.greaterThenOrEquals(this.getCalculo().getDataAjuizamento())) {
                if (Utils.naoNulo(dataFimVencimentoOcorrencia) && HelperDate.dateBeforeOrEquals(dataFimVencimentoOcorrencia, this.getCalculo().getDataAjuizamento())) {
                    this.dataInicialDeJuros = this.getCalculo().getDataAjuizamento();
                    return HelperDate.getInstance(this.getCalculo().getDataAjuizamento()).addDay(1).getDate();
                }
                if (Utils.naoNulo(dataFimVencimentoOcorrencia)) {
                    this.dataInicialDeJuros = dataFimVencimentoOcorrencia;
                    return HelperDate.getInstance(dataFimVencimentoOcorrencia).addDay(1).getDate();
                }
                this.dataInicialDeJuros = dataInicial.getDate();
                return dataInicial.addDay(1).getDate();
            }
            this.dataInicialDeJuros = this.getCalculo().getDataAjuizamento();
            return HelperDate.getInstance(this.getCalculo().getDataAjuizamento()).addDay(1).getDate();
        }
        this.dataInicialDeJuros = this.getCalculo().getDataAjuizamento();
        return HelperDate.getInstance(this.getCalculo().getDataAjuizamento()).addDay(1).getDate();
    }

    @Override
    public Date getDataInicialDeJuros() {
        return this.dataInicialDeJuros;
    }

    @Override
    public void setDataInicialDeJuros(Date dataInicialDeJuros) {
        this.dataInicialDeJuros = dataInicialDeJuros;
    }

    private TabelaDeJurosDoCalculo definirPeriodosDeJuros() {
        if (!this.periodoDeJurosCalculado) {
            PeriodoDeJuros periodo = super.getPeriodoDeJurosInicial();
            if (Utils.naoNulo(periodo)) {
                if (!periodo.isFazendaPublica()) {
                    this.periodoDeJurosPadrao = new Periodo(periodo.getDataInicial(), null);
                    while (Utils.naoNulo(periodo) && !periodo.isFazendaPublica()) {
                        this.periodoDeJurosPadrao.setFinal(periodo.getDataFinal());
                        periodo = periodo.getProximoPeriodo();
                    }
                }
                if (Utils.naoNulo(periodo) && periodo.isFazendaPublica()) {
                    this.periodoDeJurosFazendaPublica = new Periodo(periodo.getDataInicial(), null);
                    while (Utils.naoNulo(periodo) && periodo.isFazendaPublica()) {
                        this.periodoDeJurosFazendaPublica.setFinal(periodo.getDataFinal());
                        periodo = periodo.getProximoPeriodo();
                    }
                }
            }
            this.periodoDeJurosCalculado = true;
        }
        return this;
    }

    public Periodo getPeriodoDeJurosPadrao() {
        return this.definirPeriodosDeJuros().periodoDeJurosPadrao;
    }

    public Periodo getPeriodoDeJurosFazendaPublica() {
        return this.definirPeriodosDeJuros().periodoDeJurosFazendaPublica;
    }

    public BigDecimal calcularTaxaDeJuros(Date data, Date dataFimVencimentoOcorrencia, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        this.jurosDoAjuizamento = jurosDoAjuizamento;
        return super.calcularTaxaDeJuros(data, dataFimVencimentoOcorrencia, projetarData, isMultaHonorario);
    }

    public BigDecimal calcularTaxaDeJurosPagamento(Date data, Date dataFinal, JurosDoAjuizamentoEnum jurosDoAjuizamento, boolean projetarData, boolean isMultaHonorario) {
        this.jurosDoAjuizamento = jurosDoAjuizamento;
        return super.calcularTaxaDeJurosPagamento(data, dataFinal, projetarData, isMultaHonorario);
    }
}

