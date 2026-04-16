/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.salariofamilia.TabelaSalarioFamilia;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTabelaSalarioFamilia")
public class RepositorioDeTabelaSalarioFamilia
extends RepositorioBase<TabelaSalarioFamilia> {
    public RepositorioDeTabelaSalarioFamilia() {
        super(TabelaSalarioFamilia.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void remover(TabelaSalarioFamilia entidade) {
        super.remover(entidade);
    }

    @Override
    public List<TabelaSalarioFamilia> obterTodos(String orderBy) {
        return super.obterTodos(orderBy);
    }

    public List<TabelaSalarioFamilia> obterTabelasEntreCompetencias(Date competenciaInicial, Date competenciaFinal) {
        Query query = this.entityManager.createQuery("from TabelaSalarioFamilia where competencia between ? and ? order by competencia");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(competenciaInicial).getDate());
        query.setParameter(2, (Object)HelperDate.getCurrentCompetence(competenciaFinal).getDate());
        List list = query.getResultList();
        return list;
    }
}

