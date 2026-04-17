/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.CoeficienteUFIR;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCoeficienteUFIR")
public class RepositorioDeCoeficienteUFIR
extends RepositorioBase<CoeficienteUFIR> {
    public RepositorioDeCoeficienteUFIR() {
        super(CoeficienteUFIR.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<CoeficienteUFIR> obterTodos() {
        Query query = this.entityManager.createQuery("from CoeficienteUFIR order by competencia desc");
        return query.getResultList();
    }
}

