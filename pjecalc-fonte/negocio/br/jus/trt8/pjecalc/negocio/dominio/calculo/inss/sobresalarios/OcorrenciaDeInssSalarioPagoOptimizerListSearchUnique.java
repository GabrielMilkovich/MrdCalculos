/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique
extends OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> {
    private Map<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> map;

    @Override
    public OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> init(Collection<OcorrenciaDeInssSobreSalariosPagos> collection) {
        this.map = new HashMap<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos>();
        OcorrenciaInssUnique key = null;
        for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : collection) {
            key = new OcorrenciaInssUnique(ocorrencia);
            this.map.put(key, ocorrencia);
        }
        return this;
    }

    @Override
    public OcorrenciaDeInssSobreSalariosPagos search(OcorrenciaInssUnique key) {
        return this.map.get(key);
    }
}

