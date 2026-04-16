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
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasFixasDaAtualizacaoDoEvento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import java.util.Date;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCustasFixasAtualizacaoAtualizacao")
public class RepositorioDeCustasFixasDasAtualizacao
extends RepositorioBase<CustasFixasDaAtualizacaoDoEvento> {
    public RepositorioDeCustasFixasDasAtualizacao() {
        super(CustasFixasDaAtualizacaoDoEvento.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(CustasFixasDaAtualizacaoDoEvento entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(CustasFixasDaAtualizacaoDoEvento.obter(entidade.getId()));
    }

    protected CustasFixasDaAtualizacaoDoEvento obterPor(CustasJudiciaisDaAtualizacao registro, Date dataEvento) {
        return (CustasFixasDaAtualizacaoDoEvento)this.obterPorCriterio("custasJudiciaisDaAtualizacao = ? and dataEvento = ?", registro, dataEvento);
    }

    public List<CustasFixasDaAtualizacaoDoEvento> obterPor(CustasJudiciaisDaAtualizacao registro) {
        return this.obterTodosPorCriterio("dataEvento DESC", "custasJudiciaisDaAtualizacao = ?", registro);
    }

    public List<CustasFixasDaAtualizacaoDoEvento> obterTodosPor(CustasJudiciaisDaAtualizacao custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataEvento asc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciaisDaAtualizacao = ?", custasJudiciais);
        }
        List<CustasFixasDaAtualizacaoDoEvento> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public void removerTodos(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        List<CustasFixasDaAtualizacaoDoEvento> lista = this.obterTodosPor(custasJudiciaisDaAtualizacao);
        for (CustasFixasDaAtualizacaoDoEvento custasFixasDaAtualizacaoDoEvento : lista) {
            super.remover(custasFixasDaAtualizacaoDoEvento);
        }
    }
}

