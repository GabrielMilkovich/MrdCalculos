/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class OcorrenciaDeVerbaOptimizerListSearch
extends OptimizerListSearch<Competencia, OcorrenciaDeVerba> {
    private Map<Competencia, OcorrenciaIterator<OcorrenciaDeVerba>> map;

    @Override
    public OptimizerListSearch<Competencia, OcorrenciaDeVerba> init(Collection<OcorrenciaDeVerba> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<OcorrenciaDeVerba>>();
        for (OcorrenciaDeVerba ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getDataInicial());
            OcorrenciaIterator<OcorrenciaDeVerba> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<OcorrenciaDeVerba>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<OcorrenciaDeVerba> search(Competencia key) {
        OcorrenciaIterator<OcorrenciaDeVerba> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

