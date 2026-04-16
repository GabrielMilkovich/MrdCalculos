/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.EntityManager
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.hibernate.Criteria
 *  org.hibernate.Session
 *  org.hibernate.StaleObjectStateException
 *  org.jboss.seam.annotations.In
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.hibernate.Criteria;
import org.hibernate.Session;
import org.hibernate.StaleObjectStateException;
import org.jboss.seam.annotations.In;

public abstract class RepositorioBase<T extends EntidadeBase> {
    @In
    protected EntityManager entityManager;
    protected Class<T> clazz;

    public RepositorioBase(Class<T> clazz) {
        this.clazz = clazz;
    }

    public abstract TratadorDeExcecao obterTratadorDeExcecao();

    private void updateVersion(EntidadeBase entidade) {
        T novaVersao = this.obter(entidade.obterChavePrimaria());
        if (!((EntidadeBase)novaVersao).getVersao().equals(entidade.getVersao())) {
            entidade.setVersao(((EntidadeBase)novaVersao).getVersao());
            this.getSession().evict(novaVersao);
        }
    }

    public static <T extends EntidadeBase> boolean isDuplicado(T entidade, String[] atributos, Object[] valores) {
        Object id = entidade.obterChavePrimaria();
        if (Utils.nulo(id)) {
            id = 0L;
        }
        CriteriosDePesquisa criterios = new CriteriosDePesquisa();
        for (int i = 0; i < atributos.length; ++i) {
            criterios.adicionarCriterio("and", atributos[i] + "=?", valores[i]);
        }
        criterios.adicionarCriterio("and", "id!=?", id);
        return entidade.getRepositorio().existe(criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    private void persistirEntidade(EntidadeBase entidade, boolean flush) throws RuntimeException {
        block7: {
            if (Utils.nulo(entidade.obterChavePrimaria())) {
                this.getSession().persist((Object)entidade);
                if (flush) {
                    this.flush();
                    this.updateVersion(entidade);
                }
                break block7;
            }
            try {
                this.getSession().merge((Object)entidade);
            }
            catch (StaleObjectStateException se) {
                this.updateVersion(entidade);
                this.getSession().merge((Object)entidade);
            }
            if (flush) {
                this.flush();
                this.updateVersion(entidade);
            }
        }
    }

    private void validarEPersistirEntidade(EntidadeBase entidade, boolean flush) throws RuntimeException {
        entidade.validar();
        this.persistirEntidade(entidade, flush);
    }

    private void removerOneToMany(T entidade, OneToManyRemover ... removers) {
        if (removers.length == 0) {
            return;
        }
        if (Utils.naoNulo(((EntidadeBase)entidade).obterChavePrimaria()) && Utils.naoNulo(this.obter(((EntidadeBase)entidade).obterChavePrimaria()))) {
            for (OneToManyRemover remover : removers) {
                Collection<?> colecaoAnterior = remover.getCollection((EntidadeBase)entidade);
                for (Object item : colecaoAnterior) {
                    this.getSession().delete(item);
                }
                colecaoAnterior.clear();
            }
        }
    }

    private void mergeOneToMany(T entidade, OneToManyRemover ... removers) {
        if (removers.length == 0) {
            return;
        }
        if (Utils.naoNulo(((EntidadeBase)entidade).obterChavePrimaria()) && Utils.naoNulo(this.obter(((EntidadeBase)entidade).obterChavePrimaria()))) {
            for (OneToManyRemover remover : removers) {
                T entidadeAnterior = this.obter(((EntidadeBase)entidade).obterChavePrimaria());
                Collection<?> colecaoAtual = remover.getCollection((EntidadeBase)entidade);
                Collection<?> colecaoAnterior = remover.getCollection((EntidadeBase)entidadeAnterior);
                for (Object item : colecaoAnterior) {
                    if (colecaoAtual.contains(item)) continue;
                    this.getSession().delete(item);
                }
            }
        }
    }

    protected void salvar(T entidade, OneToManyRemover ... removers) {
        this.salvar(entidade, true, removers);
    }

    protected void salvar(T entidade, boolean flush, OneToManyRemover ... removers) {
        try {
            this.mergeOneToMany(entidade, removers);
            this.validarEPersistirEntidade((EntidadeBase)entidade, flush);
        }
        catch (RuntimeException re) {
            TratadorDeExcecao tratadorDeExcecao = this.obterTratadorDeExcecao();
            if (tratadorDeExcecao != null) {
                tratadorDeExcecao.tratarExcecao(re, (EntidadeBase)entidade);
            }
            throw re;
        }
    }

    protected void salvar(T entidade) {
        this.salvar(entidade, true);
    }

    protected void salvar(T entidade, boolean flush) {
        this.salvar(entidade, flush, new OneToManyRemover[0]);
    }

    protected void flush() {
        this.getSession().flush();
    }

    protected Session getSession() {
        return (Session)this.entityManager.getDelegate();
    }

    protected T obter(Object id) {
        return (T)((EntidadeBase)this.entityManager.find(this.clazz, id));
    }

    protected T obterEntidadeBase(String queryString, Object ... parametros) {
        Query query = this.entityManager.createQuery(queryString);
        for (int i = 0; i < parametros.length; ++i) {
            Object valor = parametros[i];
            query.setParameter(i + 1, valor);
        }
        try {
            return (T)((EntidadeBase)query.getSingleResult());
        }
        catch (NoResultException nre) {
            return null;
        }
    }

    protected List<T> obterListaEntidadeBases(String queryString, Object ... parametros) {
        Query query = this.entityManager.createQuery(queryString);
        for (int i = 0; i < parametros.length; ++i) {
            Object valor = parametros[i];
            query.setParameter(i + 1, valor);
        }
        return query.getResultList();
    }

    protected List<T> obterListaEntidadeBases(int firstResult, int maxResult, String queryString, Object ... parametros) {
        Query query = this.entityManager.createQuery(queryString);
        for (int i = 0; i < parametros.length; ++i) {
            Object valor = parametros[i];
            query.setParameter(i + 1, valor);
        }
        query.setFirstResult(firstResult);
        query.setMaxResults(maxResult);
        return query.getResultList();
    }

    protected <H extends T> List<H> obterListaEntidadeBases(Class<H> clazz, String queryString, Object ... parametros) {
        Query query = this.entityManager.createQuery(queryString);
        for (int i = 0; i < parametros.length; ++i) {
            Object valor = parametros[i];
            query.setParameter(i + 1, valor);
        }
        return query.getResultList();
    }

    protected List<T> obterTodos() {
        return this.obterListaEntidadeBases("from " + this.clazz.getSimpleName(), new Object[0]);
    }

    protected List<T> obterTodos(String orderBy) {
        return this.obterListaEntidadeBases("from " + this.clazz.getSimpleName() + " order by " + orderBy, new Object[0]);
    }

    protected T obterPorCriterio(String clausulaWhere, Object ... parametros) {
        return this.obterEntidadeBase("from " + this.clazz.getSimpleName() + " where " + clausulaWhere, parametros);
    }

    protected List<T> obterTodosPorCriterio(String orderBy, String clausulaWhere, Object ... parametros) {
        return this.obterListaEntidadeBases("from " + this.clazz.getSimpleName() + (clausulaWhere.isEmpty() ? "" : " where " + clausulaWhere) + (orderBy == null || orderBy.isEmpty() ? "" : " order by " + orderBy), parametros);
    }

    protected List<T> obterTodosPorCriterio(int firstResult, int maxResult, String orderBy, String clausulaWhere, Object ... parametros) {
        return this.obterListaEntidadeBases(firstResult, maxResult, "from " + this.clazz.getSimpleName() + (clausulaWhere.isEmpty() ? "" : " where " + clausulaWhere) + (orderBy == null || orderBy.isEmpty() ? "" : " order by " + orderBy), parametros);
    }

    protected List<T> obterTodosPorCriterio(Class<? extends T> clazz, String orderBy, String clausulaWhere, Object ... parametros) {
        return this.obterListaEntidadeBases("from " + clazz.getSimpleName() + (clausulaWhere.isEmpty() ? "" : " where " + clausulaWhere) + (orderBy == null || orderBy.isEmpty() ? "" : " order by " + orderBy), parametros);
    }

    protected void remover(T entidade) {
        this.remover(entidade, true);
    }

    protected void remover(T entidade, boolean flush) {
        this.remover(entidade, flush, new OneToManyRemover[0]);
    }

    protected void remover(T entidade, boolean flush, OneToManyRemover ... removers) {
        try {
            this.removerOneToMany(entidade, removers);
            Object obj = this.entityManager.merge(entidade);
            this.getSession().delete(obj);
            if (flush) {
                this.flush();
            }
        }
        catch (RuntimeException re) {
            TratadorDeExcecao tratadorDeExcecao = this.obterTratadorDeExcecao();
            if (tratadorDeExcecao != null) {
                tratadorDeExcecao.tratarExcecao(re, (EntidadeBase)entidade);
            }
            throw re;
        }
    }

    protected <O extends EntidadeBase, E extends EntidadeBase> void adicionarEm(AggregateCollection<O, E> aggregateCollection, E entidade, boolean flush) {
        O owner = aggregateCollection.getOwner();
        EntidadeBase attachadOwner = (EntidadeBase)this.entityManager.find(owner.getClass(), ((EntidadeBase)owner).obterChavePrimaria());
        Collection<E> attachadCollection = aggregateCollection.getCollection(attachadOwner);
        entidade.validar();
        attachadCollection.add(entidade);
        this.persistirEntidade(attachadOwner, flush);
    }

    protected <O extends EntidadeBase, E extends EntidadeBase> void removerDe(AggregateCollection<O, E> aggregateCollection, E entidade, boolean flush) {
        ArrayList<E> entidades = new ArrayList<E>();
        entidades.add(entidade);
        this.removerDe(aggregateCollection, entidades, flush);
    }

    protected <O extends EntidadeBase, E extends EntidadeBase> void removerDe(AggregateCollection<O, E> aggregateCollection, List<E> entidades, boolean flush) {
        try {
            O owner = aggregateCollection.getOwner();
            EntidadeBase attachadOwner = (EntidadeBase)this.entityManager.find(owner.getClass(), ((EntidadeBase)owner).obterChavePrimaria());
            Collection<E> attachadCollection = aggregateCollection.getCollection(attachadOwner);
            for (EntidadeBase entidade : entidades) {
                EntidadeBase attachadEntidade;
                if (entidade.obterChavePrimaria() == null || !Utils.naoNulo(attachadEntidade = (EntidadeBase)this.entityManager.find(entidade.getClass(), entidade.obterChavePrimaria()))) continue;
                this.getSession().delete((Object)attachadEntidade);
            }
            attachadCollection.clear();
            this.persistirEntidade(attachadOwner, flush);
        }
        catch (RuntimeException re) {
            TratadorDeExcecao tratadorDeExcecao = this.obterTratadorDeExcecao();
            if (tratadorDeExcecao != null) {
                tratadorDeExcecao.tratarExcecao(re, (EntidadeBase)aggregateCollection.getOwner());
            }
            throw re;
        }
    }

    protected Criteria criarCriterios() {
        return ((Session)this.entityManager.getDelegate()).createCriteria(this.clazz);
    }

    protected Criteria criarCriterios(Class<? extends T> clazz) {
        return ((Session)this.entityManager.getDelegate()).createCriteria(clazz);
    }

    protected long obterQuantidade(String clausulaWhere, Object ... parametros) {
        Query query = this.entityManager.createQuery("select count(*) from " + this.clazz.getSimpleName() + (clausulaWhere.isEmpty() ? "" : " where " + clausulaWhere));
        for (int i = 0; i < parametros.length; ++i) {
            Object valor = parametros[i];
            query.setParameter(i + 1, valor);
        }
        return (Long)query.getSingleResult();
    }

    protected boolean existe(String clausulaWhere, Object ... parametros) {
        return this.obterQuantidade(clausulaWhere, parametros) > 0L;
    }
}

