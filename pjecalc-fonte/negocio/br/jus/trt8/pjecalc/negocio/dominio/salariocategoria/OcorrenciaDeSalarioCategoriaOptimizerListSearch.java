/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoria;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class OcorrenciaDeSalarioCategoriaOptimizerListSearch
extends OptimizerListSearch<Competencia, OcorrenciaDeSalarioCategoria> {
    private Map<Competencia, OcorrenciaIterator<OcorrenciaDeSalarioCategoria>> map = new HashMap<Competencia, OcorrenciaIterator<OcorrenciaDeSalarioCategoria>>();

    @Override
    public OptimizerListSearch<Competencia, OcorrenciaDeSalarioCategoria> init(Collection<OcorrenciaDeSalarioCategoria> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<OcorrenciaDeSalarioCategoria>>();
        for (OcorrenciaDeSalarioCategoria ocorrencia : collection) {
            Competencia competencia = Competencia.getInstance(ocorrencia.getDataOcorrencia());
            OcorrenciaIterator<OcorrenciaDeSalarioCategoria> iterator = this.map.get(competencia);
            if (iterator == null) {
                iterator = new OcorrenciaIterator<OcorrenciaDeSalarioCategoria>(ocorrencia);
                this.map.put(competencia, iterator);
                continue;
            }
            iterator.add(ocorrencia);
        }
        return this;
    }

    @Override
    public Iterator<OcorrenciaDeSalarioCategoria> search(Competencia key) {
        OcorrenciaIterator<OcorrenciaDeSalarioCategoria> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }

    public BigDecimal valueOf(Competencia key) {
        Iterator iterator = this.map.get(key);
        if (iterator != null && iterator.hasNext()) {
            return ((OcorrenciaDeSalarioCategoria)iterator.next()).getValor();
        }
        return BigDecimal.ZERO;
    }
}

