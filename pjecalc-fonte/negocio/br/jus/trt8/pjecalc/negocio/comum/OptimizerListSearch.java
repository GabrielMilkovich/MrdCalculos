/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.util.Collection;
import java.util.Iterator;

public abstract class OptimizerListSearch<K, E extends EntidadeBase> {
    public abstract OptimizerListSearch<K, E> init(Collection<E> var1);

    public abstract Iterator<E> search(K var1);

    public Object valueOf(K key) {
        Iterator<E> iterator = this.search(key);
        if (iterator != null && iterator.hasNext()) {
            return iterator.next();
        }
        return null;
    }
}

