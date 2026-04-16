/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class OcorrenciaDoHistoricoSalarialOptimizerListSearch
extends OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> {
    private Map<Competencia, OcorrenciaIterator<OcorrenciaDoHistoricoSalarial>> map;

    @Override
    public OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> init(Collection<OcorrenciaDoHistoricoSalarial> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<OcorrenciaDoHistoricoSalarial>>();
        for (OcorrenciaDoHistoricoSalarial ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getDataOcorrencia());
            OcorrenciaIterator<OcorrenciaDoHistoricoSalarial> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<OcorrenciaDoHistoricoSalarial>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<OcorrenciaDoHistoricoSalarial> search(Competencia key) {
        OcorrenciaIterator<OcorrenciaDoHistoricoSalarial> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

