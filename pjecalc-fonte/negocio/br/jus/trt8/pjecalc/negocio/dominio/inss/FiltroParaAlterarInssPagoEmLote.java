/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class FiltroParaAlterarInssPagoEmLote
implements Serializable {
    private static final long serialVersionUID = -6199440385160874819L;
    private Date dataInicial;
    private Date dataFinal;
    private BigDecimal valor;
    private BigDecimal valorSegurado;
    private BigDecimal valorEmpresa;
    private BigDecimal valorSat;
    private BigDecimal valorTerceiro;

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

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public BigDecimal getValorSegurado() {
        return this.valorSegurado;
    }

    public void setValorSegurado(BigDecimal valorSegurado) {
        this.valorSegurado = valorSegurado;
    }

    public BigDecimal getValorEmpresa() {
        return this.valorEmpresa;
    }

    public void setValorEmpresa(BigDecimal valorEmpresa) {
        this.valorEmpresa = valorEmpresa;
    }

    public BigDecimal getValorSat() {
        return this.valorSat;
    }

    public void setValorSat(BigDecimal valorSat) {
        this.valorSat = valorSat;
    }

    public BigDecimal getValorTerceiro() {
        return this.valorTerceiro;
    }

    public void setValorTerceiro(BigDecimal valorTerceiro) {
        this.valorTerceiro = valorTerceiro;
    }

    public String getMascara() {
        return (Utils.naoNulo(this.valor) ? "1" : "0") + (Utils.naoNulo(this.valorSegurado) ? "1" : "0") + (Utils.naoNulo(this.valorEmpresa) ? "1" : "0") + (Utils.naoNulo(this.valorSat) ? "1" : "0") + (Utils.naoNulo(this.valorTerceiro) ? "1" : "0");
    }

    public FiltroParaAlterarInssPagoEmLote sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.dataFinal);
        novaData.addMonth(1);
        this.setDataInicial(novaData.getDate());
        this.setDataFinal(novaData.getDate());
        return this;
    }
}

