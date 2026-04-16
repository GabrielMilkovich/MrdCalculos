/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaVerba")
public class RepositorioDeOcorrenciaVerba
extends RepositorioBase<OcorrenciaDeVerba> {
    public RepositorioDeOcorrenciaVerba() {
        super(OcorrenciaDeVerba.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

