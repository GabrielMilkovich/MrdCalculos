/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.collection.AbstractPersistentCollection
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.util.Collection;
import org.hibernate.collection.AbstractPersistentCollection;

public class LazyloadSecure<P extends EntidadeBase> {
    private P entity;

    private LazyloadSecure(P entity) {
        this.entity = entity;
    }

    public static <P extends EntidadeBase> LazyloadSecure<P> protect(P entity) {
        return new LazyloadSecure<P>(entity);
    }

    public <F extends EntidadeBase, C extends Collection<F>> P from(C collection) {
        AbstractPersistentCollection abstractPersistentCollection = (AbstractPersistentCollection)collection;
        if (abstractPersistentCollection.getSession() == null) {
            this.entity = ((EntidadeBase)this.entity).getRepositorio().obter(((EntidadeBase)this.entity).obterChavePrimaria());
        }
        return this.entity;
    }
}

