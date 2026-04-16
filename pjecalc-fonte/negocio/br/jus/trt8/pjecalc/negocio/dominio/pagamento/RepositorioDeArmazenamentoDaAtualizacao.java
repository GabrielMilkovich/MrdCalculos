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
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.ArmazenamentoDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeArmazenamentoAtualizacao")
public class RepositorioDeArmazenamentoDaAtualizacao
extends RepositorioBase<ArmazenamentoDaAtualizacao> {
    public RepositorioDeArmazenamentoDaAtualizacao() {
        super(ArmazenamentoDaAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<ArmazenamentoDaAtualizacao> obterTodosPor(CustasJudiciaisDaAtualizacao custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataInicioArmazenamento desc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciaisDaAtualizacao = ?", custasJudiciais);
        }
        List<ArmazenamentoDaAtualizacao> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    @Override
    protected void remover(ArmazenamentoDaAtualizacao entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(ArmazenamentoDaAtualizacao.obter(entidade.getId()));
    }

    public void removerTodos(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        List<ArmazenamentoDaAtualizacao> lista = this.obterTodosPor(custasJudiciaisDaAtualizacao);
        for (ArmazenamentoDaAtualizacao armazenamentoDaAtualizacao : lista) {
            super.remover(armazenamentoDaAtualizacao);
        }
    }
}

