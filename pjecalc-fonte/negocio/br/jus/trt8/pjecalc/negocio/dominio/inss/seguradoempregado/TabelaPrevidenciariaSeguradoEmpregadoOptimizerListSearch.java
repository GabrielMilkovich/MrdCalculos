/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregado;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch
extends OptimizerListSearch<Competencia, TabelaPrevidenciariaSeguradoEmpregado> {
    private Map<Competencia, OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado>> map;
    private TabelaPrevidenciariaSeguradoEmpregado maisAtual;

    @Override
    public OptimizerListSearch<Competencia, TabelaPrevidenciariaSeguradoEmpregado> init(Collection<TabelaPrevidenciariaSeguradoEmpregado> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado>>();
        for (TabelaPrevidenciariaSeguradoEmpregado ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<TabelaPrevidenciariaSeguradoEmpregado> search(Competencia key) {
        OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        } else if (Utils.naoNulo(this.getMaisAtual()) && HelperDate.dateAfter(key.getData(), this.getMaisAtual().getCompetencia())) {
            iterator = new OcorrenciaIterator<TabelaPrevidenciariaSeguradoEmpregado>(this.getMaisAtual());
        }
        return iterator;
    }

    private TabelaPrevidenciariaSeguradoEmpregado getMaisAtual() {
        if (Utils.nulo(this.maisAtual)) {
            this.maisAtual = TabelaPrevidenciariaSeguradoEmpregado.obterAtual();
        }
        return this.maisAtual;
    }
}

