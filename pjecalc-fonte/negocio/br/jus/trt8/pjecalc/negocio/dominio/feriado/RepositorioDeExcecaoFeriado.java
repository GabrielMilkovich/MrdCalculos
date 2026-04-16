/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.feriado;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.ExcecaoDoFeriado;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeExcecaoFeriado")
public class RepositorioDeExcecaoFeriado
extends RepositorioBase<ExcecaoDoFeriado> {
    public RepositorioDeExcecaoFeriado() {
        super(ExcecaoDoFeriado.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

