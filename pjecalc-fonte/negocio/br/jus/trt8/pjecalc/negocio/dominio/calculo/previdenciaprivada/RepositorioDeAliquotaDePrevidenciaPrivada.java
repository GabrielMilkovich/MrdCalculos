/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAliquotaDePrevidenciaPrivada")
public class RepositorioDeAliquotaDePrevidenciaPrivada
extends RepositorioBase<AliquotaDePrevidenciaPrivada> {
    public RepositorioDeAliquotaDePrevidenciaPrivada() {
        super(AliquotaDePrevidenciaPrivada.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

