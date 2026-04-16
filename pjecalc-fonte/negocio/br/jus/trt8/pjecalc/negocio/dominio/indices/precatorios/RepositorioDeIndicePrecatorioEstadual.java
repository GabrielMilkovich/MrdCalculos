/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEstadual;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndicePrecatorioEstadual")
public class RepositorioDeIndicePrecatorioEstadual
extends RepositorioDeIndiceBase<IndicePrecatorioEstadual> {
    public RepositorioDeIndicePrecatorioEstadual() {
        super(IndicePrecatorioEstadual.class);
    }

    @Override
    public List<IndicePrecatorioEstadual> obterTodos() {
        Query query = this.entityManager.createQuery("from IndicePrecatorioEstadual order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    @Override
    public List<IndicePrecatorioEstadual> obterPorFiltro(IndicePrecatorioEstadual filtro) {
        Query query = this.prepararQueryParaConsulta(filtro);
        List<IndiceDeCalculo> lista = query.getResultList();
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            lista = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)lista);
        }
        return lista;
    }

    @Override
    public List<IndicePrecatorioEstadual> obterTabelaPor(Periodo periodo) {
        IndicePrecatorioEstadual indice = new IndicePrecatorioEstadual();
        indice.setCompetencia(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate());
        indice.setCompetenciaParaVerAcumulado(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        return this.obterPorFiltro(indice);
    }
}

