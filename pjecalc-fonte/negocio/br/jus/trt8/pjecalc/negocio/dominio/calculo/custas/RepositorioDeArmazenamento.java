/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeArmazenamento")
public class RepositorioDeArmazenamento
extends RepositorioBase<Armazenamento> {
    public RepositorioDeArmazenamento() {
        super(Armazenamento.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Armazenamento> obterTodosPor(CustasJudiciais custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataInicioArmazenamento desc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciais = ?", custasJudiciais);
        }
        List<Armazenamento> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }
}

