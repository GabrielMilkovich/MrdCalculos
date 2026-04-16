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
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEC1362025;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndicePrecatorioEC1362025")
public class RepositorioDeIndicePrecatorioEC1362025
extends RepositorioDeIndiceBase<IndicePrecatorioEC1362025> {
    public RepositorioDeIndicePrecatorioEC1362025() {
        super(IndicePrecatorioEC1362025.class);
    }

    @Override
    public List<IndicePrecatorioEC1362025> obterTodos() {
        Query query = this.entityManager.createQuery("from IndicePrecatorioEC1362025 order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    @Override
    public List<IndicePrecatorioEC1362025> obterPorFiltro(IndicePrecatorioEC1362025 filtro) {
        return this.obterPorFiltro(filtro, false, false);
    }

    public List<IndicePrecatorioEC1362025> obterPorFiltro(IndicePrecatorioEC1362025 filtro, boolean paraCorrecaoDeJuros, boolean paraPeriodoDaGraca) {
        Query query = this.prepararQueryParaConsulta(filtro);
        List<IndiceDeCalculo> lista = query.getResultList();
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            if (paraCorrecaoDeJuros) {
                lista = lista.stream().filter(i -> {
                    IndicePrecatorioEC1362025 ind = (IndicePrecatorioEC1362025)i;
                    return ind.getIndicePrevaleceu() != IndiceMonetarioEnum.SELIC;
                }).collect(Collectors.toList());
            }
            if (paraPeriodoDaGraca) {
                lista = lista.stream().map(i -> ((IndicePrecatorioEC1362025)i).clonar()).collect(Collectors.toList());
                for (IndiceDeCalculo i2 : lista) {
                    IndicePrecatorioEC1362025 indice = (IndicePrecatorioEC1362025)i2;
                    indice.setTaxa(indice.getTaxaPeriodoDaGraca());
                }
            }
            lista = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)lista);
        }
        return lista;
    }

    @Override
    public List<IndicePrecatorioEC1362025> obterTabelaPor(Periodo periodo) {
        return this.obterTabelaPor(periodo, false, false);
    }

    public List<IndicePrecatorioEC1362025> obterTabelaPor(Periodo periodo, boolean paraCorrecaoDeJuros, boolean paraPeriodoDaGraca) {
        IndicePrecatorioEC1362025 indice = new IndicePrecatorioEC1362025();
        indice.setCompetencia(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate());
        indice.setCompetenciaParaVerAcumulado(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        return this.obterPorFiltro(indice, paraCorrecaoDeJuros, paraPeriodoDaGraca);
    }
}

