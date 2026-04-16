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
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioFederal;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndicePrecatorioFederal")
public class RepositorioDeIndicePrecatorioFederal
extends RepositorioDeIndiceBase<IndicePrecatorioFederal> {
    public RepositorioDeIndicePrecatorioFederal() {
        super(IndicePrecatorioFederal.class);
    }

    @Override
    public List<IndicePrecatorioFederal> obterTodos() {
        Query query = this.entityManager.createQuery("from IndicePrecatorioFederal order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    @Override
    public List<IndicePrecatorioFederal> obterPorFiltro(IndicePrecatorioFederal filtro) {
        Query query = this.prepararQueryParaConsulta(filtro);
        List<IndiceDeCalculo> lista = query.getResultList();
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            lista = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)lista);
        }
        return lista;
    }

    @Override
    public List<IndicePrecatorioFederal> obterTabelaPor(Periodo periodo) {
        IndicePrecatorioFederal indice = new IndicePrecatorioFederal();
        indice.setCompetencia(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate());
        indice.setCompetenciaParaVerAcumulado(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        return this.obterPorFiltro(indice);
    }
}

