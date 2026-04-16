/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.selic;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndiceSelicFazenda")
public class RepositorioDeIndiceSelicFazenda
extends RepositorioDeIndiceBase<IndiceSelicFazenda> {
    private static final int NUMERO_MAXIMO_NO_RESULTADO = 24;

    public RepositorioDeIndiceSelicFazenda() {
        super(IndiceSelicFazenda.class);
    }

    @Override
    public List<IndiceSelicFazenda> obterTodos() {
        Query query = this.entityManager.createQuery("from IndiceSelicFazenda order by competencia desc");
        query.setMaxResults(24);
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumuladoComSomas((List<? extends IndiceDeCalculo>)list, false);
        return list;
    }

    @Override
    public List<IndiceSelicFazenda> obterTodosSemLimite() {
        Query query = this.entityManager.createQuery("from IndiceSelicFazenda order by competencia desc");
        List<IndiceDeCalculo> list = query.getResultList();
        list = CalculadorDeIndices.calcularIndiceAcumulado((List<? extends IndiceDeCalculo>)list);
        return list;
    }

    @Override
    public List<IndiceSelicFazenda> obterPorFiltro(IndiceSelicFazenda filtro) {
        Query query = this.prepararQueryParaConsulta(filtro);
        List<IndiceDeCalculo> lista = query.getResultList();
        if (Utils.naoNulo(lista) && !lista.isEmpty()) {
            lista = CalculadorDeIndices.calcularIndiceAcumuladoComSomas((List<? extends IndiceDeCalculo>)lista, false);
        }
        return lista;
    }

    @Override
    public List<IndiceSelicFazenda> obterTabelaPor(Periodo periodo) {
        IndiceSelicFazenda indice = new IndiceSelicFazenda();
        indice.setCompetencia(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate());
        indice.setCompetenciaParaVerAcumulado(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
        return this.obterPorFiltro(indice);
    }
}

