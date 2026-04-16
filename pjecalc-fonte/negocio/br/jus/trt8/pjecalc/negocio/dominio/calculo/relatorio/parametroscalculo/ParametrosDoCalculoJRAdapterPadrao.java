/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.constantes.RelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.FaltasEFeriasJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.ParametrosDoCalculoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoMensalJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.HistoricoSalarialJRAdapter;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class ParametrosDoCalculoJRAdapterPadrao
extends ParametrosDoCalculoJRAdapter {
    private Calculo calculo;
    private List<RelatorioEnum> sessoes;
    private HistoricoSalarialJRAdapter historicoSalarial;
    private CartaoDePontoMensalJRAdapter cartaoDePontoMensal;
    private FaltasEFeriasJRAdapter faltasEFerias;

    public ParametrosDoCalculoJRAdapterPadrao() {
    }

    public ParametrosDoCalculoJRAdapterPadrao(Calculo calculo, List<RelatorioEnum> sessoes) {
        this.calculo = calculo;
        this.sessoes = sessoes;
        this.iniciarAdatersAnexos();
    }

    private void iniciarAdatersAnexos() {
        if (this.getMostrarHistoricoSalarial()) {
            this.historicoSalarial = new HistoricoSalarialJRAdapter(this.calculo.getHistoricosSalariais());
        }
        if (this.getMostrarFaltasEFerias()) {
            this.faltasEFerias = new FaltasEFeriasJRAdapter(this.calculo);
        }
    }

    public boolean getMostrarDadosDoCalculo() {
        return this.sessoes.contains((Object)RelatorioEnum.DADOS_DO_CALCULO);
    }

    public boolean getMostrarHistoricoSalarial() {
        return this.sessoes.contains((Object)RelatorioEnum.HISTORICO_SALARIAL);
    }

    public boolean getMostrarFaltasEFerias() {
        return this.sessoes.contains((Object)RelatorioEnum.FALTAS_E_FERIAS);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public List<RelatorioEnum> getSessoes() {
        return this.sessoes;
    }

    public void setSessoes(List<RelatorioEnum> sessoes) {
        this.sessoes = sessoes;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public String getNumeroDoProcesso() {
        return this.calculo.getProcesso().getIdentificacao();
    }

    @Override
    public String getNumeroDoCalculo() {
        return this.calculo.getId().toString();
    }

    @Override
    public String getReclamante() {
        return this.calculo.getProcesso().getReclamante().getNome();
    }

    @Override
    public String getReclamado() {
        return this.calculo.getProcesso().getReclamado().getNome();
    }

    @Override
    public Periodo getPeriodoDeCalculo() {
        return this.calculo.obterPeriodoDoCalculo();
    }

    @Override
    public Date getDataDeAjuizamento() {
        return this.calculo.getDataAjuizamento();
    }

    @Override
    public Date getDataDaLiquidacao() {
        return this.calculo.getDataDeLiquidacao();
    }

    @Override
    public CartaoDePontoMensalJRAdapter getCartaoDePontoMensal() {
        return this.cartaoDePontoMensal;
    }

    @Override
    public HistoricoSalarialJRAdapter getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    @Override
    public FaltasEFeriasJRAdapter getFaltasEFerias() {
        return this.faltasEFerias;
    }

    @Override
    public String getEstado() {
        return this.calculo.getEstado().getSigla();
    }

    @Override
    public String getMunicipio() {
        return this.calculo.getMunicipio().getNome();
    }

    @Override
    public String getRegimeTrabalho() {
        return this.calculo.getRegimeDoContrato().getNome();
    }

    @Override
    public String getMaiorRemuneracao() {
        return Utils.formatarNumero(this.calculo.getValorMaiorRemuneracao());
    }

    @Override
    public String getPrazoAviso() {
        return this.calculo.getApuracaoPrazoDoAvisoPrevio().getNome();
    }

    @Override
    public String getZerarValorNegativo() {
        return this.calculo.getZeraValorNegativo() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public BigDecimal getCargaHoraria() {
        return this.calculo.getValorCargaHorariaPadrao();
    }

    @Override
    public Date getAdmissao() {
        return this.calculo.getDataAdmissao();
    }

    @Override
    public String getQuinquenal() {
        return this.calculo.getPrescricaoQuinquenal() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getUltimaRemuneracao() {
        return Utils.formatarNumero(this.calculo.getValorUltimaRemuneracao());
    }

    @Override
    public String getProjetarAviso() {
        return this.calculo.getProjetaAvisoIndenizado() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getConsiderarFeriadosEstaduais() {
        return this.calculo.getConsideraFeriadoEstadual() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getSabadoDiaUtil() {
        return this.calculo.getSabadoDiaUtil() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public Date getDemissao() {
        return this.calculo.getDataDemissao();
    }

    @Override
    public String getPrescricaoFgts() {
        return this.calculo.getPrescricaoFgts() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getLimitarAvos() {
        return this.calculo.getLimitarAvosAoPeriodoDoCalculo() != false ? "Sim" : "N\u00e3o";
    }

    @Override
    public String getConsiderarFeriadosMunicipais() {
        return this.calculo.getConsideraFeriadoMunicipal() != false ? "Sim" : "N\u00e3o";
    }

    public JRBeanCollectionDataSource getExcecoesCargaHoraria() {
        return new JRBeanCollectionDataSource(this.calculo.getExcecoesDaCargaHoraria());
    }

    public JRBeanCollectionDataSource getExcecoesSabadoDiaUtil() {
        return new JRBeanCollectionDataSource(this.calculo.getExcecoesDoSabado());
    }

    public JRBeanCollectionDataSource getPontosFacultativos() {
        return new JRBeanCollectionDataSource(this.calculo.getPontosFacultativos());
    }

    public boolean getMostrarExcecoesCargaHoraria() {
        return !this.calculo.getExcecoesDaCargaHoraria().isEmpty();
    }

    public boolean getMostrarExcecoesSabadoDiaUtil() {
        return !this.calculo.getExcecoesDoSabado().isEmpty();
    }

    public boolean getMostrarPontosFacultativos() {
        return !this.calculo.getPontosFacultativos().isEmpty();
    }
}

