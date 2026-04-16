/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoNacional;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class SalarioMinimoOptimizerListSearch
extends OptimizerListSearch<Competencia, SalarioMinimoNacional> {
    private Map<Competencia, OcorrenciaIterator<SalarioMinimoNacional>> map;

    @Override
    public OptimizerListSearch<Competencia, SalarioMinimoNacional> init(Collection<SalarioMinimoNacional> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<SalarioMinimoNacional>>();
        for (SalarioMinimoNacional ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<SalarioMinimoNacional> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<SalarioMinimoNacional>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<SalarioMinimoNacional> search(Competencia key) {
        OcorrenciaIterator<SalarioMinimoNacional> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }

    public BigDecimal valueOf(Competencia key) {
        Iterator<SalarioMinimoNacional> iterator = this.search(key);
        if (iterator != null && iterator.hasNext()) {
            return iterator.next().getValor();
        }
        return BigDecimal.ZERO;
    }
}

