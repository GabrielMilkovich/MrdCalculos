/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica;

import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndiceTabelaUnicaJTMensal")
public class RepositorioDeIndiceTabelaUnicaJTMensal
extends RepositorioDeIndiceBase<IndiceTabelaUnicaJTMensal> {
    public RepositorioDeIndiceTabelaUnicaJTMensal() {
        super(IndiceTabelaUnicaJTMensal.class);
    }

    public IndiceTabelaUnicaJTMensal obterUltima() {
        Query query = this.entityManager.createQuery("from IndiceTabelaUnicaJTMensal order by competencia desc");
        query.setMaxResults(1);
        IndiceTabelaUnicaJTMensal indice = (IndiceTabelaUnicaJTMensal)query.getSingleResult();
        return indice;
    }
}

