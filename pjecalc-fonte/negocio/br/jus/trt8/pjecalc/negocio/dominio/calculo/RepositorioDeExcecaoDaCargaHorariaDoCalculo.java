/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDaCargaHorariaDoCalculo;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeExcecaoDaCargaHorariaDoCalculo")
public class RepositorioDeExcecaoDaCargaHorariaDoCalculo
extends RepositorioBase<ExcecaoDaCargaHorariaDoCalculo> {
    public RepositorioDeExcecaoDaCargaHorariaDoCalculo() {
        super(ExcecaoDaCargaHorariaDoCalculo.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }
}

