/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.irpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.irpf.TabelaIrpf;
import java.util.Date;
import java.util.List;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTabelaIrpf")
public class RepositorioDeTabelaIrpf
extends RepositorioBase<TabelaIrpf> {
    public RepositorioDeTabelaIrpf() {
        super(TabelaIrpf.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<TabelaIrpf> obterTodos() {
        Query query = this.entityManager.createQuery("from TabelaIrpf order by competencia desc");
        List list = query.getResultList();
        return list;
    }

    public TabelaIrpf obterParaA(Date data) {
        Query query = this.entityManager.createQuery("from TabelaIrpf where competencia = ?");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(data).getDate());
        try {
            return (TabelaIrpf)query.getSingleResult();
        }
        catch (NoResultException ex) {
            return null;
        }
    }

    public boolean existe(TabelaIrpf indice) {
        Query query = this.entityManager.createQuery("select count(*) from TabelaIrpf where competencia = ?");
        query.setParameter(1, (Object)indice.getCompetencia());
        Long count = (Long)query.getSingleResult();
        return count > 0L;
    }
}

