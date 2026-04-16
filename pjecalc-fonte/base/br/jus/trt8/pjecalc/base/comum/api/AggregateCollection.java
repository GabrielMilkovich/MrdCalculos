/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.api;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.util.Collection;

public interface AggregateCollection<O extends EntidadeBase, E extends EntidadeBase> {
    public O getOwner();

    public Collection<E> getCollection(O var1);
}

