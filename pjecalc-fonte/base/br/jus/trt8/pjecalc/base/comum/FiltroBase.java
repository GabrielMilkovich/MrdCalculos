/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.Component;

public abstract class FiltroBase<T extends EntidadeBase> {
    private Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio;
    protected Criteria criteria;

    public FiltroBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        this.classeDoRepositorio = classeDoRepositorio;
    }

    protected <F extends FiltroBase<T>> RepositorioBase<T> getRepositorio() {
        if (Utils.isAmbienteDeTeste()) {
            return Utils.obterRepositorioParTeste(this.classeDoRepositorio);
        }
        RepositorioBase repositorio = (RepositorioBase)Component.getInstance(this.classeDoRepositorio);
        this.criteria = repositorio.criarCriterios();
        return repositorio;
    }

    public List<T> filtrar() {
        this.criteria = this.getRepositorio().criarCriterios();
        this.elaborarCriterio(this.criteria);
        return this.criteria.list();
    }

    public List<T> executar(Class<? extends T> clazz) {
        Criteria criteria = this.getRepositorio().criarCriterios(clazz);
        this.elaborarCriterio(criteria);
        return criteria.list();
    }

    protected abstract void elaborarCriterio(Criteria var1);

    public Criteria getCriteria() {
        return this.criteria;
    }

    public void setCriteria(Criteria criteria) {
        this.criteria = criteria;
    }
}

