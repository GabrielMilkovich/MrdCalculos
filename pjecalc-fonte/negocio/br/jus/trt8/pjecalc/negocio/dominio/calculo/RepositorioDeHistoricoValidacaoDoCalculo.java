/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.HistoricoValidacaoDoCalculo;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeHistoricoValidacaoDoCalculo")
public class RepositorioDeHistoricoValidacaoDoCalculo
extends RepositorioBase<HistoricoValidacaoDoCalculo> {
    public RepositorioDeHistoricoValidacaoDoCalculo() {
        super(HistoricoValidacaoDoCalculo.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<HistoricoValidacaoDoCalculo> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public HistoricoValidacaoDoCalculo obter(Object id) {
        return (HistoricoValidacaoDoCalculo)super.obter(id);
    }

    public List<HistoricoValidacaoDoCalculo> obterHistoricosDaValidacaoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from HistoricoValidacaoDoCalculo where calculo.id = ? order by dataAlteracao ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }
}

