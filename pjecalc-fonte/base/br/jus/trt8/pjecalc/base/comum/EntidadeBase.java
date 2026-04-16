/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javassist.util.proxy.MethodHandler
 *  javassist.util.proxy.ProxyFactory
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Transient
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeMethodHandle;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import javassist.util.proxy.MethodHandler;
import javassist.util.proxy.ProxyFactory;
import javax.persistence.MappedSuperclass;
import javax.persistence.Transient;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.jboss.seam.Component;

@MappedSuperclass
public abstract class EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 7594565002816892049L;
    @Transient
    private Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio;
    @Transient
    private Long versao = 0L;

    public EntidadeBase() {
    }

    public EntidadeBase(Class<? extends RepositorioBase<? extends EntidadeBase>> classeDoRepositorio) {
        this.classeDoRepositorio = classeDoRepositorio;
    }

    public abstract Object obterChavePrimaria();

    public Long getVersao() {
        return this.versao;
    }

    public void setVersao(Long versao) {
        this.versao = versao;
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> R getRepositorio(Class<R> classeDoRepositorio) {
        if (Utils.isAmbienteDeTeste()) {
            return (R)Utils.obterRepositorioParTeste(classeDoRepositorio);
        }
        return (R)((RepositorioBase)Component.getInstance(classeDoRepositorio));
    }

    public <T extends EntidadeBase> RepositorioBase<T> getRepositorio() {
        if (Utils.isAmbienteDeTeste()) {
            return Utils.obterRepositorioParTeste(this.classeDoRepositorio);
        }
        return (RepositorioBase)Component.getInstance(this.classeDoRepositorio);
    }

    protected EntidadeBase validar() {
        return this;
    }

    protected void salvar() {
        this.getRepositorio().salvar(this);
    }

    protected void salvar(boolean flush) {
        this.getRepositorio().salvar(this, flush);
    }

    public static <T extends EntidadeBase> void salvar(T entidade) {
        entidade.salvar();
    }

    public static <T extends EntidadeBase> void salvar(Collection<T> lista) {
        for (EntidadeBase entidade : lista) {
            entidade.salvar();
        }
    }

    protected boolean isAtachado() {
        return this.getRepositorio().getSession().isOpen() && this.getRepositorio().getSession().contains((Object)this);
    }

    public <E extends EntidadeBase> E restaurar(Class<E> clazz) {
        return (E)this.getRepositorio().obter(this.obterChavePrimaria());
    }

    public <E extends EntidadeBase> E restaurar(Class<E> clazz, Object id) {
        return (E)this.getRepositorio().obter(id);
    }

    public EntidadeBase restaurar() {
        return this.getRepositorio().obter(this.obterChavePrimaria());
    }

    public static <T extends EntidadeBase, R extends RepositorioBase<T>> T obter(Class<R> classeDoRepositorio, Object id) {
        return ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).obter(id);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> List<T> obterTodos(Class<R> classeDoRepositorio) {
        return ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).obterTodos();
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> List<T> obterTodos(Class<R> classeDoRepositorio, String orderBy) {
        return ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).obterTodos(orderBy);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> T obterPorCriterio(Class<R> classeDoRepositorio, String clausulaWhere, Object ... parametros) {
        return ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).obterPorCriterio(clausulaWhere, parametros);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> List<T> obterTodosPorCriterio(Class<R> classeDoRepositorio, String clausulaWhere, Object ... parametros) {
        return ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).obterTodosPorCriterio(null, clausulaWhere, parametros);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> void remover(Class<R> classeDoRepositorio, T entidade) {
        EntidadeBase.remover(classeDoRepositorio, entidade, false);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> void remover(Class<R> classeDoRepositorio, T entidade, boolean flush) {
        ((RepositorioBase)EntidadeBase.getRepositorio(classeDoRepositorio)).remover(entidade, flush);
    }

    protected static <T extends EntidadeBase, R extends RepositorioBase<T>> T obterComProtecao(Class<R> classeDoRepositorio, Object id) {
        T entidade = EntidadeBase.obter(classeDoRepositorio, id);
        ProxyFactory factory = new ProxyFactory();
        factory.setHandler((MethodHandler)new EntidadeMethodHandle((EntidadeBase)entidade));
        factory.setSuperclass(entidade.getClass());
        try {
            return (T)((EntidadeBase)factory.createClass().newInstance());
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    protected String toString(String ... atributos) {
        return Utils.objetoParaString(this, atributos);
    }

    protected HashCodeBuilder getHashCodeBuilder() {
        if (this.obterChavePrimaria() == null) {
            return new HashCodeBuilder(1, 31).appendSuper(super.hashCode());
        }
        return new HashCodeBuilder(1, 31).append(this.obterChavePrimaria()).append((Object)this.getVersao());
    }

    protected EqualsBuilder getEqualsBuilder(Object obj) {
        if (this == obj) {
            return new EqualsBuilder().append(true, true);
        }
        if (obj == null) {
            return new EqualsBuilder().append(true, false);
        }
        if (this.getClass() != obj.getClass()) {
            return new EqualsBuilder().append(true, false);
        }
        EntidadeBase other = (EntidadeBase)obj;
        if (this.obterChavePrimaria() == null) {
            return new EqualsBuilder().append(true, this == other);
        }
        return new EqualsBuilder().append(this.obterChavePrimaria(), other.obterChavePrimaria()).append((Object)this.getVersao(), (Object)other.getVersao());
    }

    public int hashCode() {
        return this.getHashCodeBuilder().hashCode();
    }

    public boolean equals(Object obj) {
        return this.getEqualsBuilder(obj).isEquals();
    }
}

