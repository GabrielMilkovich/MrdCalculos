/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.AutoJudicialDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAutoJudicialAtualizacao")
public class RepositorioDeAutoJudicialDaAtualizacao
extends RepositorioBase<AutoJudicialDaAtualizacao> {
    public RepositorioDeAutoJudicialDaAtualizacao() {
        super(AutoJudicialDaAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<AutoJudicialDaAtualizacao> obterTodosPor(CustasJudiciaisDaAtualizacao custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataVencimentoAuto asc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciaisDaAtualizacao = ?", custasJudiciais);
        }
        List<AutoJudicialDaAtualizacao> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    @Override
    protected void remover(AutoJudicialDaAtualizacao entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(AutoJudicialDaAtualizacao.obter(entidade.getId()));
    }

    public void removerTodos(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        List<AutoJudicialDaAtualizacao> lista = this.obterTodosAuto(custasJudiciaisDaAtualizacao);
        for (AutoJudicialDaAtualizacao autoJudicialDaAtualizacao : lista) {
            super.remover(autoJudicialDaAtualizacao);
        }
    }

    protected List<AutoJudicialDaAtualizacao> obterTodosAuto(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        Query query = this.entityManager.createQuery("from AutoJudicialDaAtualizacao where custasJudiciaisDaAtualizacao.id = ?");
        query.setParameter(1, (Object)custasJudiciaisDaAtualizacao.getId());
        return query.getResultList();
    }
}

