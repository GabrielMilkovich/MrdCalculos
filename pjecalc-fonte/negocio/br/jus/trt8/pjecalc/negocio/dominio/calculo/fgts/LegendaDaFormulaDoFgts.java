/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.LinkedHashSet;
import java.util.Set;

public class LegendaDaFormulaDoFgts
implements Serializable {
    private static final long serialVersionUID = -7779898373287857594L;
    private static final String LEGENDA_PADRAO_DA_BASE = "0";
    private Fgts fgts;
    private Set<String> basesHistoricos;
    private Set<String> basesVerbas;

    public LegendaDaFormulaDoFgts(Fgts fgts) {
        this.fgts = fgts;
        this.basesHistoricos = new LinkedHashSet<String>();
        this.basesVerbas = new LinkedHashSet<String>();
        this.init();
    }

    private void init() {
        for (HistoricoSalarial historico : this.fgts.getCalculo().getHistoricosSalariais()) {
            if (!historico.getIncidenciaFGTS().booleanValue()) continue;
            this.basesHistoricos.add(historico.getNome());
        }
        for (VerbaDeCalculo verba : this.fgts.getCalculo().getVerbas()) {
            if (!verba.getAtivo().booleanValue() || !verba.getIncidenciaFGTS().booleanValue()) continue;
            this.basesVerbas.add(verba.getNome());
        }
    }

    public Set<String> getBasesHistoricos() {
        return this.basesHistoricos;
    }

    public Set<String> getBasesVerbas() {
        return this.basesVerbas;
    }

    private boolean branco(StringBuilder str) {
        return str.length() == 0;
    }

    private String getBases() {
        StringBuilder str = new StringBuilder();
        for (String nomeDaVerba : this.basesHistoricos) {
            str.append(" + ").append(nomeDaVerba);
        }
        for (String nomeDaVerba : this.basesVerbas) {
            str.append(" + ").append(nomeDaVerba);
        }
        if (this.branco(str)) {
            str.append(LEGENDA_PADRAO_DA_BASE);
        } else {
            str.delete(0, 3);
        }
        return str.toString();
    }

    public String getLegenda() {
        return String.format("(%s) x %s", this.getBases(), this.fgts.getAliquota().getNome()).toUpperCase();
    }

    public String toString() {
        return this.getLegenda();
    }
}

