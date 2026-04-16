/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicinss.JurosSelicInss;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosSelicInss")
public class RepositorioDeJurosSelicInss
extends RepositorioBase<JurosSelicInss> {
    public RepositorioDeJurosSelicInss() {
        super(JurosSelicInss.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<JurosSelicInss> obterTodos() {
        Query query = this.entityManager.createQuery("from JurosSelicInss order by competencia desc");
        List lista = query.getResultList();
        JurosSelicInss jurosAnterior = null;
        for (JurosSelicInss jurosSelicInss : lista) {
            if (Utils.nulo(jurosAnterior)) {
                jurosSelicInss.setTaxaAcumulada(jurosSelicInss.getTaxa());
            } else {
                jurosSelicInss.setTaxaAcumulada(jurosSelicInss.getTaxa().add(jurosAnterior.getTaxaAcumulada(), Utils.CONTEXTO_MATEMATICO));
            }
            jurosAnterior = jurosSelicInss;
        }
        return lista;
    }

    public List<JurosSelicInss> obterTodosPorPeriodo(Date dataInicio, Date dataFim) {
        return super.obterTodosPorCriterio("competencia desc", "competencia>=? and competencia<=?", dataInicio, dataFim);
    }
}

