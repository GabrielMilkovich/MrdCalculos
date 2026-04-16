/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique
extends OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> {
    private Map<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> map;

    @Override
    public OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> init(Collection<OcorrenciaDeInssSobreSalariosDevidos> collection) {
        this.map = new HashMap<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos>();
        OcorrenciaInssUnique key = null;
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : collection) {
            key = new OcorrenciaInssUnique(ocorrencia);
            this.map.put(key, ocorrencia);
        }
        return this;
    }

    @Override
    public OcorrenciaDeInssSobreSalariosDevidos search(OcorrenciaInssUnique key) {
        return this.map.get(key);
    }
}

