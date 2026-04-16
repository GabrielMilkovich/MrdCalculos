/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ExcecaoDoFechamentoDeCartaoDePonto;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeExcecaoDoFechamentoDeCartaoDePonto")
public class RepositorioDeExcecaoDoFechamentoDeCartaoDePonto
extends RepositorioBase<ExcecaoDoFechamentoDeCartaoDePonto> {
    public RepositorioDeExcecaoDoFechamentoDeCartaoDePonto() {
        super(ExcecaoDoFechamentoDeCartaoDePonto.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

