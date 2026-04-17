/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.inss.TabelaPrevidenciaria;
import java.util.Date;
import java.util.List;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public abstract class RepositorioDeTabelaPrevidenciaria<T extends TabelaPrevidenciaria>
extends RepositorioBase<T> {
    private Class<T> clazz;
    private final Logger logger = LoggerFactory.getLogger(RepositorioDeTabelaPrevidenciaria.class);

    public RepositorioDeTabelaPrevidenciaria(Class<T> clazz) {
        super(clazz);
        this.clazz = clazz;
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<T> obterTodos() {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " order by competencia desc");
        List list = query.getResultList();
        return list;
    }

    public List<T> obterTodosNoPeriodo(Date dataInicial, Date dataFinal) {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " where competencia between ? and ? order by competencia");
        query.setParameter(1, (Object)HelperDate.getCurrentCompetence(dataInicial).getDate());
        query.setParameter(2, (Object)HelperDate.getCurrentCompetence(dataFinal).getDate());
        List list = query.getResultList();
        return list;
    }

    public boolean existe(T indice) {
        Query query = this.entityManager.createQuery("select count(*) from " + this.clazz.getSimpleName() + " where competencia = ?");
        query.setParameter(1, (Object)((TabelaPrevidenciaria)indice).getCompetencia());
        Long count = (Long)query.getSingleResult();
        return count > 0L;
    }

    public T obter(Date competencia) {
        try {
            Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " where competencia = ?");
            query.setParameter(1, (Object)competencia);
            return (T)((TabelaPrevidenciaria)query.getSingleResult());
        }
        catch (NoResultException e) {
            this.logger.error(e.getMessage(), (Throwable)e);
            return null;
        }
    }

    public T obterAtual() {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " where competencia = (select max(competencia) from " + this.clazz.getSimpleName() + " )");
        return (T)((TabelaPrevidenciaria)query.getSingleResult());
    }
}

