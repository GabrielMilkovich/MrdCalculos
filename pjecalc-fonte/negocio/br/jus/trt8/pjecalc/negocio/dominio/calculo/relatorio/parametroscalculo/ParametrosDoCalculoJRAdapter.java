/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.FaltasEFeriasJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoMensalJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.HistoricoSalarialJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public abstract class ParametrosDoCalculoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public abstract String getNumeroDoProcesso();

    public abstract String getNumeroDoCalculo();

    public abstract String getReclamante();

    public abstract String getReclamado();

    public abstract Periodo getPeriodoDeCalculo();

    public abstract Date getDataDeAjuizamento();

    public abstract Date getDataDaLiquidacao();

    public abstract String getEstado();

    public abstract String getMunicipio();

    public abstract String getRegimeTrabalho();

    public abstract String getMaiorRemuneracao();

    public abstract String getPrazoAviso();

    public abstract String getZerarValorNegativo();

    public abstract BigDecimal getCargaHoraria();

    public abstract Date getAdmissao();

    public abstract String getQuinquenal();

    public abstract String getUltimaRemuneracao();

    public abstract String getProjetarAviso();

    public abstract String getConsiderarFeriadosEstaduais();

    public abstract String getSabadoDiaUtil();

    public abstract Date getDemissao();

    public abstract String getPrescricaoFgts();

    public abstract String getLimitarAvos();

    public abstract String getConsiderarFeriadosMunicipais();

    public abstract CartaoDePontoMensalJRAdapter getCartaoDePontoMensal();

    public abstract HistoricoSalarialJRAdapter getHistoricoSalarial();

    public abstract FaltasEFeriasJRAdapter getFaltasEFerias();
}

