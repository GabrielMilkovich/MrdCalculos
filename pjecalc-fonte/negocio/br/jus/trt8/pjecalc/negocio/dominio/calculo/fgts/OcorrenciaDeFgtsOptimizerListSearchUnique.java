/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class OcorrenciaDeFgtsOptimizerListSearchUnique
extends OptimizerListSearchUnique<Competencia, OcorrenciaDeFgts> {
    private Map<Competencia, OcorrenciaDeFgts> map;

    @Override
    public OptimizerListSearchUnique<Competencia, OcorrenciaDeFgts> init(Collection<OcorrenciaDeFgts> collection) {
        this.map = new HashMap<Competencia, OcorrenciaDeFgts>();
        Competencia competencia = null;
        for (OcorrenciaDeFgts ocorrencia : collection) {
            competencia = Competencia.getInstance(ocorrencia.getOcorrencia());
            this.map.put(competencia, ocorrencia);
        }
        return this;
    }

    @Override
    public OcorrenciaDeFgts search(Competencia key) {
        return this.map.get(key);
    }
}

