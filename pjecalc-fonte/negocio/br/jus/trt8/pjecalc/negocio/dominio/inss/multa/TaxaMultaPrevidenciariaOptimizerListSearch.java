/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.multa;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OcorrenciaIterator;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciaria;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class TaxaMultaPrevidenciariaOptimizerListSearch
extends OptimizerListSearch<Competencia, TaxaMultaPrevidenciaria> {
    private Map<Competencia, OcorrenciaIterator<TaxaMultaPrevidenciaria>> map;
    private Date dataFinalApuracao;

    public TaxaMultaPrevidenciariaOptimizerListSearch(Date dataFinalApuracao) {
        this.dataFinalApuracao = dataFinalApuracao;
    }

    @Override
    public OptimizerListSearch<Competencia, TaxaMultaPrevidenciaria> init(Collection<TaxaMultaPrevidenciaria> collection) {
        this.map = new HashMap<Competencia, OcorrenciaIterator<TaxaMultaPrevidenciaria>>();
        for (TaxaMultaPrevidenciaria ocorrencia : collection) {
            Date dataFinal = ocorrencia.getDataFinal();
            if (Utils.nulo(dataFinal)) {
                dataFinal = this.dataFinalApuracao;
            }
            List<Periodo> competencias = HelperDate.breakInMonths(ocorrencia.getDataInicial(), dataFinal);
            for (Periodo periodoCompetencia : competencias) {
                Competencia competencia = Competencia.getInstance(periodoCompetencia.getInicial());
                OcorrenciaIterator<TaxaMultaPrevidenciaria> iterator = this.map.get(competencia);
                if (iterator == null) {
                    iterator = new OcorrenciaIterator<TaxaMultaPrevidenciaria>(ocorrencia);
                    this.map.put(competencia, iterator);
                    continue;
                }
                iterator.add(ocorrencia);
            }
        }
        return this;
    }

    @Override
    public Iterator<TaxaMultaPrevidenciaria> search(Competencia key) {
        OcorrenciaIterator<TaxaMultaPrevidenciaria> iterator = this.map.get(key);
        if (iterator != null) {
            iterator.gotoFirst();
        }
        return iterator;
    }
}

