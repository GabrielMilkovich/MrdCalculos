/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariominimo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.SalarioMinimoBase;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;

public abstract class RepositorioDeSalarioMinimoBase<T extends SalarioMinimoBase>
extends RepositorioBase<T> {
    private Class<T> clazz;

    public RepositorioDeSalarioMinimoBase(Class<T> clazz) {
        super(clazz);
        this.clazz = clazz;
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<T> obterTodos() {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " order by competencia desc");
        return query.getResultList();
    }

    public List<T> obterTodosNoPeriodo(Date dataInicial, Date dataFinal) {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " where competencia between ? and ? order by competencia");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(dataInicial).getDate());
        query.setParameter(2, (Object)HelperDate.getCurrentCompetence(dataFinal).getDate());
        List list = query.getResultList();
        return list;
    }
}

