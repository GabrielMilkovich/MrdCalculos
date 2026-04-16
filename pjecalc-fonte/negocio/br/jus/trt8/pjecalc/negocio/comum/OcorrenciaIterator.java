/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.util.Iterator;

public class OcorrenciaIterator<E extends EntidadeBase>
implements Iterator<E> {
    private EntidadeWrapper root;
    private EntidadeWrapper current;

    public OcorrenciaIterator(E root) {
        this.root = new EntidadeWrapper(this, root);
        this.gotoFirst();
    }

    public void gotoFirst() {
        this.current = this.root;
    }

    public OcorrenciaIterator<E> add(E entidade) {
        this.root.getLast().setNext(new EntidadeWrapper(this, entidade));
        return this;
    }

    @Override
    public boolean hasNext() {
        return this.current != null;
    }

    @Override
    public E next() {
        EntidadeWrapper result = this.current;
        this.current = result.getNext();
        return result.getEntidade();
    }

    @Override
    public void remove() {
    }

    static class EntidadeWrapper {
        private E entidade;
        private EntidadeWrapper next;
        final /* synthetic */ OcorrenciaIterator this$0;

        public EntidadeWrapper(E entidade) {
            this.this$0 = this$0;
            this.entidade = entidade;
        }

        public E getEntidade() {
            return this.entidade;
        }

        public boolean hasNext() {
            return this.next != null;
        }

        public void setNext(EntidadeWrapper next) {
            this.next = next;
        }

        public EntidadeWrapper getNext() {
            return this.next;
        }

        public EntidadeWrapper getLast() {
            if (this.hasNext()) {
                return this.getNext().getLast();
            }
            return this;
        }
    }
}

