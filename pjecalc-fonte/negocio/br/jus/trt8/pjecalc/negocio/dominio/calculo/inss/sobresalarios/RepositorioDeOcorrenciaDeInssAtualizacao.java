/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeInssAtualizacao")
public class RepositorioDeOcorrenciaDeInssAtualizacao<T extends OcorrenciaDeInssAtualizacao>
extends RepositorioBase<T> {
    public RepositorioDeOcorrenciaDeInssAtualizacao(Class<T> clazz) {
        super(clazz);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

