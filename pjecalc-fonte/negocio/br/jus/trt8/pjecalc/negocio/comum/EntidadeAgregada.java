/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;

public abstract class EntidadeAgregada
extends EntidadeBase {
    private static final long serialVersionUID = -3872439730674917959L;

    public EntidadeAgregada() {
        super(Repositorio.class);
    }

    class Repositorio
    extends RepositorioBase<EntidadeAgregada> {
        public Repositorio(Class<EntidadeAgregada> clazz) {
            super(clazz);
        }

        @Override
        public TratadorDeExcecao obterTratadorDeExcecao() {
            return TratadorDeExcecaoImpl.instance();
        }
    }
}

