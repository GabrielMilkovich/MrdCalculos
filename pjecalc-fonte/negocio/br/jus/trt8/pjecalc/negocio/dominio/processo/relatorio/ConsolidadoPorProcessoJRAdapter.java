/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo.ResumoPorProcessoJRAdapter;
import java.util.Date;

public abstract class ConsolidadoPorProcessoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public abstract String getNumeroDoProcesso();

    public abstract String getReclamado();

    public abstract Date getDataDeAjuizamento();

    public abstract Date getDataDaLiquidacao();

    public abstract Date getDataDaLiquidacaoAtualizacao();

    public abstract ResumoPorProcessoJRAdapter getResumo();
}

