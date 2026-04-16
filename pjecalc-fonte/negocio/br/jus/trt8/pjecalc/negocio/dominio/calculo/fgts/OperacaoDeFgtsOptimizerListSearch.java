/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class OperacaoDeFgtsOptimizerListSearch
extends OptimizerListSearch<Competencia, OperacaoDeFgts> {
    private Map<Competencia, OcorrenciaIterator<OperacaoDeFgts>> map;

    @Override
    public OptimizerListSearch<Competencia, OperacaoDeFgts> init(Collection<OperacaoDeFgts> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<OperacaoDeFgts>>();
        for (OperacaoDeFgts ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<OperacaoDeFgts> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<OperacaoDeFgts>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<OperacaoDeFgts> search(Competencia key) {
        OcorrenciaIterator<OperacaoDeFgts> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

