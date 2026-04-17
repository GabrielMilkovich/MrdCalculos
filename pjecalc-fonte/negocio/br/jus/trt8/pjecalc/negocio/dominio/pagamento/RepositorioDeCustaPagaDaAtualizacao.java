/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustaPagaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCustaPagaAtualizacao")
public class RepositorioDeCustaPagaDaAtualizacao
extends RepositorioBase<CustaPagaDaAtualizacao> {
    public RepositorioDeCustaPagaDaAtualizacao() {
        super(CustaPagaDaAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<CustaPagaDaAtualizacao> obterTodosPor(CustasJudiciaisDaAtualizacao custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataVencimento desc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciaisDaAtualizacao = ?", custasJudiciais);
        }
        List<CustaPagaDaAtualizacao> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    @Override
    protected void remover(CustaPagaDaAtualizacao entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(CustaPagaDaAtualizacao.obter(entidade.getId()));
    }

    public void removerTodos(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        List<CustaPagaDaAtualizacao> lista = this.obterTodosPor(custasJudiciaisDaAtualizacao);
        for (CustaPagaDaAtualizacao custaPagaDaAtualizacao : lista) {
            super.remover(custaPagaDaAtualizacao);
        }
    }
}

