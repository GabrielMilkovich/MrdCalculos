/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeIrpf")
public class RepositorioDeOcorrenciaDeIrpf
extends RepositorioBase<OcorrenciaDeIrpf> {
    public RepositorioDeOcorrenciaDeIrpf() {
        super(OcorrenciaDeIrpf.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

