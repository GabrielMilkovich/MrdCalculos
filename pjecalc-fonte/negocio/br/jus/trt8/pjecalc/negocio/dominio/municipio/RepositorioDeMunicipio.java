/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.municipio;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeMunicipio")
public class RepositorioDeMunicipio
extends RepositorioBase<Municipio> {
    public RepositorioDeMunicipio() {
        super(Municipio.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    protected List<Municipio> obterTodasCapitais() {
        return super.obterTodosPorCriterio("nome", "indicadorCapital='S'", new Object[0]);
    }

    protected List<Municipio> obterTodasPorEstado(Estado estado) {
        return super.obterTodosPorCriterio("nome", "estado=?", estado);
    }
}

