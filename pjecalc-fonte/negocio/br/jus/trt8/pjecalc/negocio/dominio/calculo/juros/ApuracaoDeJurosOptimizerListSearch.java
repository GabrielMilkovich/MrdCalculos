/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.juros;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class ApuracaoDeJurosOptimizerListSearch
extends OptimizerListSearch<Competencia, ApuracaoDeJuros> {
    private Map<Competencia, OcorrenciaIterator<ApuracaoDeJuros>> map;

    @Override
    public OptimizerListSearch<Competencia, ApuracaoDeJuros> init(Collection<ApuracaoDeJuros> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<ApuracaoDeJuros>>();
        for (ApuracaoDeJuros ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<ApuracaoDeJuros> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<ApuracaoDeJuros>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<ApuracaoDeJuros> search(Competencia key) {
        OcorrenciaIterator<ApuracaoDeJuros> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

