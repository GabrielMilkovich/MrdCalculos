/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.Utils;
import java.util.Collection;

public class HelperIterate<E> {
    private Collection<E> collection;

    private HelperIterate(Collection<E> collection) {
        this.collection = collection;
    }

    public static <E> HelperIterate<E> iterate(Collection<E> collection) {
        return new HelperIterate<E>(collection);
    }

    public boolean where(Where<E> where) {
        if (Utils.naoNulo(this.collection)) {
            for (E item : this.collection) {
                if (!where.evaluate(item)) continue;
                return true;
            }
        }
        return false;
    }

    public static interface Where<E> {
        public boolean evaluate(E var1);
    }
}

