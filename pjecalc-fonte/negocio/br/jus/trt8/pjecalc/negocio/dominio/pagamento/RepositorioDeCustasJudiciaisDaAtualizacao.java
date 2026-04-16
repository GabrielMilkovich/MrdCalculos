/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCustasJudiciaisAtualizacao")
public class RepositorioDeCustasJudiciaisDaAtualizacao
extends RepositorioBase<CustasJudiciaisDaAtualizacao> {
    public RepositorioDeCustasJudiciaisDaAtualizacao() {
        super(CustasJudiciaisDaAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(CustasJudiciaisDaAtualizacao entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(CustasJudiciaisDaAtualizacao.obter(entidade.getId()));
    }

    public void removerTodos(Atualizacao atualizacao) {
        List<CustasJudiciaisDaAtualizacao> lista = this.obterTodosCustasJudiciais(atualizacao);
        for (CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao : lista) {
            super.remover(custasJudiciaisDaAtualizacao);
        }
    }

    protected List<CustasJudiciaisDaAtualizacao> obterTodosCustasJudiciais(Atualizacao atualizacao) {
        Query query = this.entityManager.createQuery("from CustasJudiciaisDaAtualizacao where atualizacao.id = ? order by dataFinalPeriodo asc");
        query.setParameter(1, (Object)atualizacao.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(CustasJudiciaisDaAtualizacao entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciaisDaAtualizacao)entity).getAutosJudiciais();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciaisDaAtualizacao)entity).getArmazenamentos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciaisDaAtualizacao)entity).getCustasPagasDoReclamado();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciaisDaAtualizacao)entity).getCustasPagasDoReclamante();
            }
        });
    }
}

