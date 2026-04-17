/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.ConsolidadoPorProcessoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo.ResumoPorProcessoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo.ResumoPorProcessoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeRelatorio;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

public class ConsolidadoPorProcessoJRAdapterPadrao
extends ConsolidadoPorProcessoJRAdapter {
    private List<Calculo> calculos;
    private ResumoPorProcessoJRAdapter resumo;

    public ConsolidadoPorProcessoJRAdapterPadrao() {
    }

    public ConsolidadoPorProcessoJRAdapterPadrao(List<Calculo> calculos) {
        this.calculos = new ArrayList<Calculo>();
        for (Calculo calculo : calculos) {
            this.calculos.add((Calculo)calculo.restaurar());
        }
        this.resumo = new ResumoPorProcessoJRAdapterPadrao(this.calculos);
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    @Override
    public String getNumeroDoProcesso() {
        return ServicoDeRelatorio.obterNumeroProcesso(this.calculos);
    }

    @Override
    public String getReclamado() {
        return this.calculos.get(0).getProcesso().getReclamado().getNome();
    }

    @Override
    public Date getDataDeAjuizamento() {
        return this.calculos.get(0).getDataAjuizamento();
    }

    @Override
    public Date getDataDaLiquidacao() {
        return this.calculos.get(0).getDataDeLiquidacao();
    }

    @Override
    public Date getDataDaLiquidacaoAtualizacao() {
        return this.calculos.get(0).getAtualizacao().getDataDeLiquidacao();
    }

    public List<Calculo> getCalculos() {
        return this.calculos;
    }

    public void setCalculos(List<Calculo> calculos) {
        this.calculos = calculos;
    }

    @Override
    public ResumoPorProcessoJRAdapter getResumo() {
        return this.resumo;
    }
}

