/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDePensaoAlimenticia
implements Serializable {
    private static final long serialVersionUID = 1060662948004207573L;
    private static final String LEGENDA_PADRAO_DA_ALIQUOTA = "Al\u00edquota";
    private PensaoAlimenticia pensaoAlimenticia;
    private List<String> basesVerbas;

    public LegendaDaFormulaDePensaoAlimenticia(PensaoAlimenticia pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
        this.basesVerbas = new ArrayList<String>();
        this.init();
    }

    private void init() {
        for (VerbaDeCalculo verba : this.pensaoAlimenticia.getCalculo().getVerbas()) {
            if (!verba.getAtivo().booleanValue() || !verba.getIncidenciaPensaoAlimenticia().booleanValue()) continue;
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
        if (!this.branco(str)) {
            str.delete(0, 3);
        }
        return str.toString();
    }

    private String getAliquota() {
        if (Utils.nulo(this.pensaoAlimenticia.getAliquota())) {
            return LEGENDA_PADRAO_DA_ALIQUOTA;
        }
        return Utils.formatarNumero(this.pensaoAlimenticia.getAliquota()) + "%";
    }

    public String getLegenda() {
        Fgts fgts;
        StringBuilder str = new StringBuilder("(((");
        if (!this.getBases().isEmpty()) {
            str.append(this.getBases());
        }
        if ((fgts = this.pensaoAlimenticia.getCalculo().getFgts()).getIncidenciaPensaoAlimenticia().booleanValue()) {
            str.append(" + FGTS ");
            if (fgts.getDeduzirDoFGTS().booleanValue()) {
                str.append("- SAQUE E/OU SALDO ");
            }
            if (fgts.getMulta().booleanValue() && fgts.getIncidenciaPensaoAlimenticiaSobreMulta().booleanValue()) {
                str.append("+ MULTA FGTS ");
            }
        }
        str.append(')');
        if (str.length() > 4) {
            if (this.pensaoAlimenticia.getIncidirSobreJuros().booleanValue()) {
                str.append("+ JUROS) X ");
            } else {
                str.append(") X ");
            }
        } else {
            str.append(") X ");
        }
        str.append(this.getAliquota());
        str.append(')');
        return str.toString().toUpperCase();
    }

    public String toString() {
        return this.getLegenda();
    }
}

