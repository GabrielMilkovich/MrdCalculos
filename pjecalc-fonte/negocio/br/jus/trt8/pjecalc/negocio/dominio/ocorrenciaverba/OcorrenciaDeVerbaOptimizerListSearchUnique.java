/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDaVerbaUnique;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class OcorrenciaDeVerbaOptimizerListSearchUnique
extends OptimizerListSearchUnique<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba> {
    private Map<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba> map;

    @Override
    public OptimizerListSearchUnique<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba> init(Collection<OcorrenciaDeVerba> collection) {
        this.map = new HashMap<OcorrenciaDaVerbaUnique, OcorrenciaDeVerba>();
        OcorrenciaDaVerbaUnique key = null;
        for (OcorrenciaDeVerba ocorrencia : collection) {
            key = new OcorrenciaDaVerbaUnique(ocorrencia);
            this.map.put(key, ocorrencia);
        }
        return this;
    }

    @Override
    public OcorrenciaDeVerba search(OcorrenciaDaVerbaUnique key) {
        return this.map.get(key);
    }
}

