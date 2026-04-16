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
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasEmpresaPorAtividadeEconomica;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAliquotasEmpresaPorAtividadeEconomica")
public class RepositorioDeAliquotasEmpresaPorAtividadeEconomica
extends RepositorioBase<AliquotasEmpresaPorAtividadeEconomica> {
    public RepositorioDeAliquotasEmpresaPorAtividadeEconomica() {
        super(AliquotasEmpresaPorAtividadeEconomica.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

