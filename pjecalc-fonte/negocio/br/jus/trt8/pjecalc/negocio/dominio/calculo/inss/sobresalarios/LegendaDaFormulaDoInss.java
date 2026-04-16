/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDoInss
implements Serializable {
    private static final long serialVersionUID = -750724924346677245L;
    private Inss inss;
    private List<String> basesHistoricos;
    private List<String> basesVerbas;

    public LegendaDaFormulaDoInss(Inss inss) {
        this.inss = inss;
        this.basesHistoricos = new ArrayList<String>();
        this.basesVerbas = new ArrayList<String>();
        this.init();
    }

    private void init() {
        for (HistoricoSalarial historico : this.inss.getCalculo().getHistoricosSalariais()) {
            if (!historico.getIncidenciaINSS().booleanValue()) continue;
            this.basesHistoricos.add(historico.getNome());
        }
        for (VerbaDeCalculo verba : this.inss.getCalculo().getVerbas()) {
            if (!verba.getAtivo().booleanValue() || !verba.getIncidenciaINSS().booleanValue()) continue;
            this.basesVerbas.add(verba.getNome());
        }
    }

    public List<String> getBasesHistoricos() {
        return this.basesHistoricos;
    }

    public List<String> getBasesVerbas() {
        return this.basesVerbas;
    }

    public String getLegendaSalariosDevidos() {
        StringBuilder str = new StringBuilder();
        if (!this.basesVerbas.isEmpty()) {
            for (String nomeDaVerba : this.basesVerbas) {
                if (this.basesVerbas.indexOf(nomeDaVerba) == 0) {
                    str.append(nomeDaVerba);
                    continue;
                }
                str.append(" + ").append(nomeDaVerba);
            }
        }
        return str.toString().toUpperCase();
    }

    public String getLegendaSalariosPagos() {
        StringBuilder str = new StringBuilder();
        if (!this.basesHistoricos.isEmpty()) {
            for (String nomeDaVerba : this.basesHistoricos) {
                if (this.basesHistoricos.indexOf(nomeDaVerba) == 0) {
                    str.append(nomeDaVerba);
                    continue;
                }
                str.append(" + ").append(nomeDaVerba);
            }
        }
        return str.toString().toUpperCase();
    }
}

