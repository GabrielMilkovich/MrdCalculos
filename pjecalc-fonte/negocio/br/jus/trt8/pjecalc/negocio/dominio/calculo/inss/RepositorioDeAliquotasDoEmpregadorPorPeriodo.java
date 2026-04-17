/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.AliquotasDoEmpregadorPorPeriodo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAliquotasDoEmpregadorPorPeriodo")
public class RepositorioDeAliquotasDoEmpregadorPorPeriodo
extends RepositorioBase<AliquotasDoEmpregadorPorPeriodo> {
    public RepositorioDeAliquotasDoEmpregadorPorPeriodo() {
        super(AliquotasDoEmpregadorPorPeriodo.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<AliquotasDoEmpregadorPorPeriodo> obterTodosPor(Inss inss) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataInicioPeriodo desc");
        if (inss != null && inss.getId() != null) {
            criterios.adicionarCriterio("and", "inss = ?", inss);
        }
        List<AliquotasDoEmpregadorPorPeriodo> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }
}

