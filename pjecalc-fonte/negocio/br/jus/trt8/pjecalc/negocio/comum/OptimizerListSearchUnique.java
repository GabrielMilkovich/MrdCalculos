/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.util.Collection;

public abstract class OptimizerListSearchUnique<K, E extends EntidadeBase> {
    public abstract OptimizerListSearchUnique<K, E> init(Collection<E> var1);

    public abstract E search(K var1);
}

