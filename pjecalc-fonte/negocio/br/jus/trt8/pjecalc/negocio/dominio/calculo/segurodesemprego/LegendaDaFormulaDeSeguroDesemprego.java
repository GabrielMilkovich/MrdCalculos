/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemHistoricoSalarialDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemSalarioDevidoDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDeSeguroDesemprego
implements Serializable {
    private static final long serialVersionUID = 2337173629504558940L;
    private SeguroDesemprego seguroDesemprego;
    private List<String> bases;

    public LegendaDaFormulaDeSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this.seguroDesemprego = seguroDesemprego;
        this.bases = new ArrayList<String>();
        this.init();
    }

    private void init() {
        if (TipoSalarioPagoEnum.HISTORICO_SALARIAL == this.seguroDesemprego.getTipoSalarioPago()) {
            for (ItemHistoricoSalarialDeSeguroDesemprego itemHistoricoSalarialDeSeguroDesemprego : this.seguroDesemprego.getItensHistoricoSalarialDeSegudoDesemprego()) {
                this.bases.add(itemHistoricoSalarialDeSeguroDesemprego.getHistoricoSalarial().getNome());
            }
        }
        for (ItemSalarioDevidoDeSeguroDesemprego itemSalarioDevidoDeSeguroDesemprego : this.seguroDesemprego.getItensSalarioDevidoDeSeguroDesemprego()) {
            this.bases.add(itemSalarioDevidoDeSeguroDesemprego.getVerbaDeCalculo().getNome());
        }
    }

    private String getBases() {
        StringBuilder str = new StringBuilder();
        switch (this.seguroDesemprego.getTipoSalarioPago()) {
            case MAIOR_REMUNERACAO: 
            case ULTIMA_REMUNERACAO: {
                str.append(" + " + this.seguroDesemprego.getTipoSalarioPago().getNome());
                break;
            }
        }
        for (String nomeDasBases : this.bases) {
            str.append(" + ").append(nomeDasBases);
        }
        if (str.length() > 3) {
            str.delete(0, 3);
        }
        return str.toString().toUpperCase();
    }

    public String getLegenda() {
        return this.getBases();
    }

    public String toString() {
        return this.getLegenda();
    }
}

