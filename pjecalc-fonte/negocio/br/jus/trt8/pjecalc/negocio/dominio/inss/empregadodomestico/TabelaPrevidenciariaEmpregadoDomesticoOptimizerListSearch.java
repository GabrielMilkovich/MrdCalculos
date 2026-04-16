/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomestico;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class TabelaPrevidenciariaEmpregadoDomesticoOptimizerListSearch
extends OptimizerListSearch<Competencia, TabelaPrevidenciariaEmpregadoDomestico> {
    private Map<Competencia, OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico>> map;
    private TabelaPrevidenciariaEmpregadoDomestico maisAtual;

    @Override
    public OptimizerListSearch<Competencia, TabelaPrevidenciariaEmpregadoDomestico> init(Collection<TabelaPrevidenciariaEmpregadoDomestico> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico>>();
        Competencia competencia = null;
        OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico> iterator = null;
        for (TabelaPrevidenciariaEmpregadoDomestico ocorrencia : collection) {
            competencia = Competencia.getInstance(ocorrencia.getCompetencia());
            iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<TabelaPrevidenciariaEmpregadoDomestico> search(Competencia key) {
        OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        } else if (Utils.naoNulo(this.getMaisAtual()) && HelperDate.dateAfter(key.getData(), this.getMaisAtual().getCompetencia())) {
            iterator = new OcorrenciaIterator<TabelaPrevidenciariaEmpregadoDomestico>(this.getMaisAtual());
        }
        return iterator;
    }

    private TabelaPrevidenciariaEmpregadoDomestico getMaisAtual() {
        if (Utils.nulo(this.maisAtual)) {
            this.maisAtual = TabelaPrevidenciariaEmpregadoDomestico.obterAtual();
        }
        return this.maisAtual;
    }
}

