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
import br.jus.trt8.pjecalc.negocio.dominio.inss.atividadeeconomica.AliquotasTerceirosPorAtividadeEconomica;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAliquotasTerceirosPorAtividadeEconomica")
public class RepositorioDeAliquotasTerceirosPorAtividadeEconomica
extends RepositorioBase<AliquotasTerceirosPorAtividadeEconomica> {
    public RepositorioDeAliquotasTerceirosPorAtividadeEconomica() {
        super(AliquotasTerceirosPorAtividadeEconomica.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

