/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal;

import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.JurosTaxaLegal;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosTaxaLegal")
public class RepositorioDeJurosTaxaLegal
extends RepositorioDeIndiceBase<JurosTaxaLegal> {
    public RepositorioDeJurosTaxaLegal() {
        super(JurosTaxaLegal.class);
    }

    @Override
    public List<JurosTaxaLegal> obterTodosSemLimite() {
        Query query = this.entityManager.createQuery("from JurosTaxaLegal order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumuladoComSomas((List<? extends IndiceDeCalculo>)list, Boolean.TRUE);
        return list;
    }
}

