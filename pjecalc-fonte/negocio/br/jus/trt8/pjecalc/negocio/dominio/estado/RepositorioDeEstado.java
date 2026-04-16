/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.estado;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeEstado")
public class RepositorioDeEstado
extends RepositorioBase<Estado> {
    public RepositorioDeEstado() {
        super(Estado.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Estado> obterTodosOrdenado() {
        return super.obterListaEntidadeBases("from Estado order by SNMESTADO", new Object[0]);
    }

    public Estado obterEstadoPadrao() {
        return (Estado)this.obterPorCriterio("sigla = ?", "DF");
    }
}

