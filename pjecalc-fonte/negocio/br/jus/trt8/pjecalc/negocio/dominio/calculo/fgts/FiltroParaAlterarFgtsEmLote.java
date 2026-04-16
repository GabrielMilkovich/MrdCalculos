/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class FiltroParaAlterarFgtsEmLote
implements Serializable {
    private static final long serialVersionUID = 3956671059755183182L;
    private Date dataInicial;
    private Date dataFinal;
    private BigDecimal valorBase;
    private BigDecimal valorRecolhido;

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

    public BigDecimal getValorBase() {
        return this.valorBase;
    }

    public void setValorBase(BigDecimal valorBase) {
        this.valorBase = valorBase;
    }

    public BigDecimal getValorRecolhido() {
        return this.valorRecolhido;
    }

    public void setValorRecolhido(BigDecimal valorRecolhido) {
        this.valorRecolhido = valorRecolhido;
    }

    public String getMascara() {
        return (Utils.naoNulo(this.valorBase) ? "1" : "0") + (Utils.naoNulo(this.valorRecolhido) ? "1" : "0");
    }

    public FiltroParaAlterarFgtsEmLote sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.dataFinal);
        novaData.addMonth(1);
        this.setDataInicial(novaData.getDate());
        this.setDataFinal(novaData.getDate());
        return this;
    }
}

