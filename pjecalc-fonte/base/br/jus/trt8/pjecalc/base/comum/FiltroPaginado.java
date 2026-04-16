/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import java.util.List;

public abstract class FiltroPaginado<T extends EntidadeBase>
extends FiltroBase<T> {
    public static final int NUM_LINHA = 10;

    public FiltroPaginado(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    public abstract List<T> filtrar(int var1);

    public abstract int getTotal();

    public abstract void reset();
}

