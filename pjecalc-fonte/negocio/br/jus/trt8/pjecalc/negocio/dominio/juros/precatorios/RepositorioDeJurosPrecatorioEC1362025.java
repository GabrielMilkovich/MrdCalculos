/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios;

import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios.JurosPrecatorioEC1362025;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosPrecatorioEC1362025")
public class RepositorioDeJurosPrecatorioEC1362025
extends RepositorioDeIndiceBase<JurosPrecatorioEC1362025> {
    public RepositorioDeJurosPrecatorioEC1362025() {
        super(JurosPrecatorioEC1362025.class);
    }

    @Override
    public List<JurosPrecatorioEC1362025> obterTodosSemLimite() {
        Query query = this.entityManager.createQuery("from JurosPrecatorioEC1362025 order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumuladoComSomas((List<? extends IndiceDeCalculo>)list, Boolean.TRUE);
        return list;
    }
}

