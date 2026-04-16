/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class FiltroParaAlterarInssDevidoEmLote
implements Serializable {
    private static final long serialVersionUID = -8510606349072731011L;
    private Date dataInicial;
    private Date dataFinal;
    private BigDecimal salariosPago;

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Date getDataFinal() {
        if (Utils.naoNulo(this.dataFinal)) {
            return HelperDate.getInstance(this.dataFinal).lastDayOfTheMonth().getDate();
        }
        return null;
    }

    public void setDataFinal(Date dataFinal) {
        this.dataFinal = dataFinal;
    }

    public BigDecimal getSalariosPago() {
        return this.salariosPago;
    }

    public void setSalariosPago(BigDecimal salariosPago) {
        this.salariosPago = salariosPago;
    }

    public String getMascara() {
        return Utils.naoNulo(this.salariosPago) ? "1" : "0";
    }

    public FiltroParaAlterarInssDevidoEmLote sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.dataFinal);
        novaData.addMonth(1);
        this.setDataInicial(novaData.getDate());
        this.setDataFinal(novaData.getDate());
        return this;
    }
}

