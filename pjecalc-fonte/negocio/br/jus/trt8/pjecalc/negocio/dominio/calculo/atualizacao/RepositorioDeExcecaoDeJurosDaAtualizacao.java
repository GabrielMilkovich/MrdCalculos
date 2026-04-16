/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ExcecaoDeJurosDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import java.util.Date;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeExcecaoDeJurosDaAtualizacao")
public class RepositorioDeExcecaoDeJurosDaAtualizacao
extends RepositorioBase<ExcecaoDeJurosDaAtualizacao> {
    public RepositorioDeExcecaoDeJurosDaAtualizacao() {
        super(ExcecaoDeJurosDaAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<ExcecaoDeJurosDaAtualizacao> obterPeriodoDeExcecaoDeJurosDaAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        return super.obterTodosPorCriterio("dataInicio", "parametrosDeAtualizacao=?", parametrosDeAtualizacao);
    }

    public List<ExcecaoDeJurosDaAtualizacao> obterPeriodoDeExcecaoDeJurosDaAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao, Date dataInicio, Date dataFim) {
        return super.obterTodosPorCriterio("dataInicio", "parametrosDeAtualizacao=? and ((dataInicio <= ? and dataFim >= ?) or (dataInicio >= ? and dataFim <= ?) or (dataInicio <= ? and dataFim >= ?))", parametrosDeAtualizacao, dataInicio, dataInicio, dataInicio, dataFim, dataFim, dataFim);
    }
}

