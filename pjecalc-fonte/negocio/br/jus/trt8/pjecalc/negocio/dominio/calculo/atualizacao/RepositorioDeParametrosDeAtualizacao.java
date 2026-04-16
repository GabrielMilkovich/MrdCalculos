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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeParametrosDeAtualizacao")
public class RepositorioDeParametrosDeAtualizacao
extends RepositorioBase<ParametrosDeAtualizacao> {
    private static final String PARAMETROS_DE_ATUALIZACAO = "parametrosDeAtualizacao";

    public RepositorioDeParametrosDeAtualizacao() {
        super(ParametrosDeAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(ParametrosDeAtualizacao entidade) {
        super.salvar(entidade);
    }

    public void removerIndicesCombinadosNaoReferenciados(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        if (parametrosDeAtualizacao.getListaDeCombinacaoDeIndices().isEmpty()) {
            this.entityManager.createQuery("DELETE FROM CombinacaoDeIndice ci WHERE ci.parametrosDeAtualizacao = :parametrosDeAtualizacao").setParameter(PARAMETROS_DE_ATUALIZACAO, (Object)parametrosDeAtualizacao).executeUpdate();
        } else {
            this.entityManager.createQuery("DELETE FROM CombinacaoDeIndice ci WHERE ci.parametrosDeAtualizacao = :parametrosDeAtualizacao AND ci NOT IN (:listaCombinacoes)").setParameter(PARAMETROS_DE_ATUALIZACAO, (Object)parametrosDeAtualizacao).setParameter("listaCombinacoes", parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()).executeUpdate();
        }
    }

    public void removerJurosCombinadosNaoReferenciados(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        if (parametrosDeAtualizacao.getListaDeCombinacaoDeJuros().isEmpty()) {
            this.entityManager.createQuery("DELETE FROM CombinacaoDeJuros cj WHERE cj.parametrosDeAtualizacao = :parametrosDeAtualizacao").setParameter(PARAMETROS_DE_ATUALIZACAO, (Object)parametrosDeAtualizacao).executeUpdate();
        } else {
            this.entityManager.createQuery("DELETE FROM CombinacaoDeJuros cj WHERE cj.parametrosDeAtualizacao = :parametrosDeAtualizacao AND cj NOT IN (:listaCombinacoes)").setParameter(PARAMETROS_DE_ATUALIZACAO, (Object)parametrosDeAtualizacao).setParameter("listaCombinacoes", parametrosDeAtualizacao.getListaDeCombinacaoDeJuros()).executeUpdate();
        }
    }
}

