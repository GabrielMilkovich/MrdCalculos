/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.indices.coeficienteufir.CoeficienteUFIR;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class CoeficienteUFIROptimizerListSearch
extends OptimizerListSearch<Competencia, CoeficienteUFIR> {
    private Map<Competencia, OcorrenciaIterator<CoeficienteUFIR>> map;

    @Override
    public OptimizerListSearch<Competencia, CoeficienteUFIR> init(Collection<CoeficienteUFIR> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<CoeficienteUFIR>>();
        for (CoeficienteUFIR ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<CoeficienteUFIR> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<CoeficienteUFIR>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<CoeficienteUFIR> search(Competencia key) {
        OcorrenciaIterator<CoeficienteUFIR> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

