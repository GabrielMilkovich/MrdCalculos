/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDoSalarioCategoria")
public class RepositorioDeOcorrenciaDoSalarioCategoria
extends RepositorioBase<OcorrenciaDeSalarioCategoria> {
    public RepositorioDeOcorrenciaDoSalarioCategoria() {
        super(OcorrenciaDeSalarioCategoria.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<OcorrenciaDeSalarioCategoria> obterOcorrenciasPorCompetencia(SalarioCategoria salarioCategoria, Date competencia) {
        Query query = this.entityManager.createQuery("from OcorrenciaDeSalarioCategoria where salarioCategoria =? and dataOcorrencia = ?");
        query.setParameter(1, (Object)salarioCategoria);
        query.setParameter(2, (Object)competencia);
        return query.getResultList();
    }
}

