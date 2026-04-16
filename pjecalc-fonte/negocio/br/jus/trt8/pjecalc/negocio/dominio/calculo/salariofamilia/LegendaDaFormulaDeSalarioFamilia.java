/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemSalarioDevido;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDeSalarioFamilia
implements Serializable {
    private static final long serialVersionUID = 2337173629504558940L;
    private SalarioFamilia salarioFamilia;
    private List<String> bases;

    public LegendaDaFormulaDeSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
        this.bases = new ArrayList<String>();
        this.init();
    }

    private void init() {
        if (TipoSalarioPagoEnum.HISTORICO_SALARIAL == this.salarioFamilia.getTipoSalarioPago()) {
            for (ItemHistoricoSalarial itemHistoricoSalarial : this.salarioFamilia.getItensHistoricoSalarial()) {
                this.bases.add(itemHistoricoSalarial.getHistoricoSalarial().getNome());
            }
        }
        for (ItemSalarioDevido itemSalarioDevido : this.salarioFamilia.getItensSalarioDevido()) {
            this.bases.add(itemSalarioDevido.getVerbaDeCalculo().getNome());
        }
    }

    private String getBases() {
        StringBuilder str = new StringBuilder();
        switch (this.salarioFamilia.getTipoSalarioPago()) {
            case MAIOR_REMUNERACAO: 
            case ULTIMA_REMUNERACAO: {
                str.append(" + " + this.salarioFamilia.getTipoSalarioPago().getNome());
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

