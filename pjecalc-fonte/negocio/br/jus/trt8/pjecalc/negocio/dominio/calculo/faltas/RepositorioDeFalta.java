/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeFalta")
public class RepositorioDeFalta
extends RepositorioBase<Falta> {
    public RepositorioDeFalta() {
        super(Falta.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Falta> obterTodosPor(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataInicioPeriodoFalta desc");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", calculo);
        }
        List<Falta> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }
}

