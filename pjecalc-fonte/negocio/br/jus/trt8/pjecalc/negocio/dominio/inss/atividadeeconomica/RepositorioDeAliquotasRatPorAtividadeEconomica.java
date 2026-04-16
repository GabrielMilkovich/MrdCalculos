/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasRatPorAtividadeEconomica;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAliquotasRatPorAtividadeEconomica")
public class RepositorioDeAliquotasRatPorAtividadeEconomica
extends RepositorioBase<AliquotasRatPorAtividadeEconomica> {
    public RepositorioDeAliquotasRatPorAtividadeEconomica() {
        super(AliquotasRatPorAtividadeEconomica.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

