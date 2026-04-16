/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.NoResultException
 *  javax.persistence.Query
 *  org.jboss.seam.Component
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.jam.IndiceJAM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaDebitoTrabalhista;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.JurosTaxaLegal;
import java.util.Date;
import java.util.List;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import org.jboss.seam.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public abstract class RepositorioDeIndiceBase<T extends IndiceBase>
extends RepositorioBase<T> {
    private static final int PRIMEIRO_PARAMETRO = 1;
    private static final int SEGUNDO_PARAMETRO = 2;
    private static final int NUMERO_MAXIMO_NO_RESULTADO = 24;
    private final Logger logger = LoggerFactory.getLogger(RepositorioDeIndiceBase.class);
    private Class<T> clazz;

    public RepositorioDeIndiceBase(Class<T> clazz) {
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
        query.setMaxResults(24);
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    public List<T> obterTodosSemLimite() {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    public T obterPorCompetencia(Date competencia) {
        IndiceBase indice;
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " where competencia <= ? and competencia >= ?");
        query.setParameter(1, (Object)competencia);
        query.setParameter(2, (Object)competencia);
        try {
            indice = (IndiceBase)query.getSingleResult();
        }
        catch (NoResultException nre) {
            this.logger.info(nre.getMessage(), (Throwable)nre);
            indice = null;
        }
        return (T)indice;
    }

    public List<T> obterPorFiltro(T filtro) {
        Query query = this.prepararQueryParaConsulta(filtro);
        List<IndiceDeCalculo> lista = query.getResultList();
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            lista = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)lista);
        }
        return lista;
    }

    protected Query prepararQueryParaConsulta(T filtro) {
        StringBuilder queryDinamica = new StringBuilder("from " + this.clazz.getSimpleName());
        if (Utils.naoNulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.naoNulo(((IndiceBase)filtro).getCompetencia())) {
            queryDinamica.append(" where competencia between ? and ?");
        } else if (Utils.nulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.naoNulo(((IndiceBase)filtro).getCompetencia())) {
            queryDinamica.append(" where competencia <= ? ");
        } else if (Utils.naoNulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.nulo(((IndiceBase)filtro).getCompetencia())) {
            queryDinamica.append(" where competencia >= ? ");
        }
        queryDinamica.append(" order by competencia desc");
        Query query = this.entityManager.createQuery(queryDinamica.toString());
        if (Utils.naoNulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.naoNulo(((IndiceBase)filtro).getCompetencia())) {
            query.setParameter(1, (Object)((IndiceBase)filtro).getCompetenciaParaVerAcumulado());
            query.setParameter(2, (Object)((IndiceBase)filtro).getCompetencia());
        } else if (Utils.nulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.naoNulo(((IndiceBase)filtro).getCompetencia())) {
            query.setParameter(1, (Object)((IndiceBase)filtro).getCompetencia());
        } else if (Utils.naoNulo(((IndiceBase)filtro).getCompetenciaParaVerAcumulado()) && Utils.nulo(((IndiceBase)filtro).getCompetencia())) {
            query.setParameter(1, (Object)((IndiceBase)filtro).getCompetenciaParaVerAcumulado());
        }
        return query;
    }

    public boolean existe(T indice) {
        Query query = this.entityManager.createQuery("select count(*) from " + this.clazz.getSimpleName() + " where competencia = ?");
        query.setParameter(1, (Object)((IndiceBase)indice).getCompetencia());
        Long count = (Long)query.getSingleResult();
        return count > 0L;
    }

    public List<T> obterTabelaPor(Periodo periodo) {
        IndiceBase indice = (IndiceBase)Component.getInstance(this.clazz);
        if (this.verificarSeIndiceDiario(indice)) {
            indice.setCompetencia(HelperDate.getInstance(periodo.getFinal()).getDate());
            indice.setCompetenciaParaVerAcumulado(HelperDate.getInstance(periodo.getInicial()).getDate());
        } else {
            indice.setCompetencia(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate());
            indice.setCompetenciaParaVerAcumulado(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        }
        return this.obterPorFiltro(indice);
    }

    private boolean verificarSeIndiceDiario(T indice) {
        boolean indiceDiario = indice instanceof IndiceTabelaUnicaJTDiario || indice instanceof IndiceJAM || indice instanceof IndiceSelicDiaria;
        indiceDiario = indiceDiario || indice instanceof IndiceTabelaUnicaDebitoTrabalhista || indice instanceof JurosTaxaLegal;
        return indiceDiario;
    }
}

