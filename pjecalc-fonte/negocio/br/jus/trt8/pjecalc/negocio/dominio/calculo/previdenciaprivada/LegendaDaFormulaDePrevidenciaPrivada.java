/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDePrevidenciaPrivada
implements Serializable {
    private static final long serialVersionUID = 1060662948004207573L;
    private static final String LEGENDA_PADRAO_DA_ALIQUOTA = "Al\u00edquota";
    private static final String LEGENDA_PADRAO_DA_BASE = "Base";
    private PrevidenciaPrivada previdenciaPrivada;
    private List<String> basesVerbas;

    public LegendaDaFormulaDePrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
        this.basesVerbas = new ArrayList<String>();
        this.init();
    }

    private void init() {
        for (VerbaDeCalculo verba : this.previdenciaPrivada.getCalculo().getVerbas()) {
            if (!verba.getAtivo().booleanValue() || !verba.getIncidenciaPrevidenciaPrivada().booleanValue()) continue;
            this.basesVerbas.add(verba.getNome());
        }
    }

    public List<String> getBasesVerbas() {
        return this.basesVerbas;
    }

    private boolean branco(StringBuilder str) {
        return str.length() == 0;
    }

    private String getBases() {
        StringBuilder str = new StringBuilder();
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

    private String getAliquota() {
        return LEGENDA_PADRAO_DA_ALIQUOTA;
    }

    public String getLegenda() {
        return String.format("(%s) x %s", this.getBases(), this.getAliquota());
    }

    public String toString() {
        return this.getLegenda();
    }
}

