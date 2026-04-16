/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego.TabelaSeguroDesemprego;
import java.util.Date;
import java.util.List;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTabelaSeguroDesemprego")
public class RepositorioDeTabelaSeguroDesemprego
extends RepositorioBase<TabelaSeguroDesemprego> {
    public RepositorioDeTabelaSeguroDesemprego() {
        super(TabelaSeguroDesemprego.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void remover(TabelaSeguroDesemprego entidade) {
        super.remover(entidade);
    }

    @Override
    public List<TabelaSeguroDesemprego> obterTodos(String orderBy) {
        return super.obterTodos(orderBy);
    }

    public TabelaSeguroDesemprego obterParaA(Date data) {
        Query query = this.entityManager.createQuery("from TabelaSeguroDesemprego where competencia = ?");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(data).getDate());
        try {
            return (TabelaSeguroDesemprego)query.getSingleResult();
        }
        catch (NoResultException ex) {
            return null;
        }
    }
}

