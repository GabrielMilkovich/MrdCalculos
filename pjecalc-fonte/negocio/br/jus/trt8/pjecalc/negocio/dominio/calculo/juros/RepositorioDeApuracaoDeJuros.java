/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.juros;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeApuracaoDeJuros")
public class RepositorioDeApuracaoDeJuros
extends RepositorioBase<ApuracaoDeJuros> {
    public RepositorioDeApuracaoDeJuros() {
        super(ApuracaoDeJuros.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void remover(ApuracaoDeJuros entidade, boolean flush) {
        super.remover(entidade, flush);
    }
}

