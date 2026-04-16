/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.multa;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciaria;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTaxaMultaPrevidenciaria")
public class RepositorioDeTaxaMultaPrevidenciaria
extends RepositorioBase<TaxaMultaPrevidenciaria> {
    public RepositorioDeTaxaMultaPrevidenciaria() {
        super(TaxaMultaPrevidenciaria.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<TaxaMultaPrevidenciaria> obterTodos(Date dataInicio, Date dataFim) {
        Query query = this.entityManager.createQuery("from TaxaMultaPrevidenciaria where (dataFinal >= ? or dataFinal is null) and dataInicial <= ? order by dataInicial desc");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(dataInicio).getDate());
        query.setParameter(2, (Object)HelperDate.getCurrentCompetence(dataFim).getDate());
        List list = query.getResultList();
        return list;
    }
}

