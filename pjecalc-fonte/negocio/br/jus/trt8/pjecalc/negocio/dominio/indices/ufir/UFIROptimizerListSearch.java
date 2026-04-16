/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.ufir;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ufir.UFIR;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class UFIROptimizerListSearch
extends OptimizerListSearch<Competencia, UFIR> {
    private Map<Competencia, OcorrenciaIterator<UFIR>> map;

    @Override
    public OptimizerListSearch<Competencia, UFIR> init(Collection<UFIR> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<UFIR>>();
        for (UFIR ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<UFIR> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<UFIR>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<UFIR> search(Competencia key) {
        OcorrenciaIterator<UFIR> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

