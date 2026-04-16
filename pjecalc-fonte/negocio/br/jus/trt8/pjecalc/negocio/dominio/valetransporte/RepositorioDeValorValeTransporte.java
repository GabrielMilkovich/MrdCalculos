/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.valetransporte;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValorValeTransporte;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeValorValeTransporte")
public class RepositorioDeValorValeTransporte
extends RepositorioBase<ValorValeTransporte> {
    public RepositorioDeValorValeTransporte() {
        super(ValorValeTransporte.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

