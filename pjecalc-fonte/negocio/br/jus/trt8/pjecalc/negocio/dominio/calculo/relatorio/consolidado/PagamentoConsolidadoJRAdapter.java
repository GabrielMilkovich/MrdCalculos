/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.DemonstrativoAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.InssAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.IrpfHonorariosAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.JustificativaJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamento;
import java.math.BigDecimal;
import java.util.Date;

public abstract class PagamentoConsolidadoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public abstract String getIdentificacao();

    public abstract String getNumeroDoProcesso();

    public abstract String getNumeroDoCalculo();

    public abstract String getReclamante();

    public abstract String getReclamado();

    public abstract Periodo getPeriodoDeCalculo();

    public abstract String getDataDeUltimaAtualizacao();

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

    public abstract boolean isCalculoExterno();

    public abstract boolean getMostrarDemonstrativo();

    public abstract boolean getMostrarDemonstrativoPrecatorio();

    public abstract boolean getMostrarResumo();

    public abstract boolean getMostrarResumoPrecatorio();

    public abstract boolean getMostrarAlgoAlemDoResumoEJustificativa();

    public abstract boolean getMostrarDemonstrativoINSS();

    public abstract boolean getMostrarDemonstrativoEsocial();

    public abstract boolean getMostrarIrpf();

    public abstract boolean getMostrarIrpfHonorarios();

    public abstract boolean getMostrarCustas();

    public abstract boolean getMostrarComentarios();

    public abstract boolean getMostrarJustificativas();

    public abstract String getComentarios();

    public abstract ResumoJRAdapterPagamento getResumoPagamento();

    public abstract ResumoPrecatorioJRAdapterPagamento getResumoPrecatorio();

    public abstract JustificativaJRAdapter getJustificativa();

    public abstract DemonstrativoAtualizacaoJRAdapter getDemonstrativo();

    public abstract DemonstrativoAtualizacaoJRAdapter getDemonstrativoPrecatorio();

    public abstract InssAtualizacaoJRAdapter getDemonstrativoINSS();

    public abstract EsocialAtualizacaoJRAdapter getDemonstrativoEsocial();

    public abstract IrpfAtualizacaoJRAdapter getIrpf();

    public abstract IrpfHonorariosAtualizacaoJRAdapter getIrpfHonorarios();

    public abstract CustaAtualizacaoJRAdapter getCustas();
}

