/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.assuntocnj;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAssuntoCnj")
public class RepositorioDeAssuntoCnj
extends RepositorioBase<AssuntoCnj> {
    public RepositorioDeAssuntoCnj() {
        super(AssuntoCnj.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<AssuntoCnj> obterRaizes() {
        return super.obterListaEntidadeBases("from AssuntoCnj a where a.pai = null", new Object[0]);
    }

    public AssuntoCnj obterRaiz() {
        return (AssuntoCnj)super.obterListaEntidadeBases(0, 1, "from AssuntoCnj a where a.pai is null", new Object[0]).get(0);
    }
}

