/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

public class FiltroParaAlterarVerbaEmLote
implements Serializable {
    private static final long serialVersionUID = 444963056744205889L;
    private Date dataInicial;
    private Date dataFinal;
    private BigDecimal divisor;
    private BigDecimal multiplicador;
    private Boolean propQuantidade;
    private BigDecimal quantidade;
    private Boolean dobra;
    private Boolean propPago;
    private BigDecimal pago;
    private Boolean propDevido;
    private BigDecimal devido;

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Date getDataFinal() {
        return this.dataFinal;
    }

    public void setDataFinal(Date dataFinal) {
        this.dataFinal = dataFinal;
    }

    public BigDecimal getDivisor() {
        return this.divisor;
    }

    public void setDivisor(BigDecimal divisor) {
        this.divisor = divisor;
    }

    public BigDecimal getMultiplicador() {
        return this.multiplicador;
    }

    public void setMultiplicador(BigDecimal multiplicador) {
        this.multiplicador = multiplicador;
    }

    public BigDecimal getQuantidade() {
        return this.quantidade;
    }

    public void setQuantidade(BigDecimal quantidade) {
        this.quantidade = quantidade;
    }

    public Boolean getDobra() {
        return this.dobra;
    }

    public void setDobra(Boolean dobra) {
        this.dobra = dobra;
    }

    public BigDecimal getDevido() {
        return this.devido;
    }

    public void setDevido(BigDecimal devido) {
        this.devido = devido;
    }

    public BigDecimal getPago() {
        return this.pago;
    }

    public void setPago(BigDecimal pago) {
        this.pago = pago;
    }

    public Boolean getPropQuantidade() {
        return this.propQuantidade;
    }

    public void setPropQuantidade(Boolean propQuantidade) {
        this.propQuantidade = propQuantidade;
    }

    public Boolean getPropPago() {
        return this.propPago;
    }

    public void setPropPago(Boolean propPago) {
        this.propPago = propPago;
    }

    public Boolean getPropDevido() {
        return this.propDevido;
    }

    public void setPropDevido(Boolean propDevido) {
        this.propDevido = propDevido;
    }

    public Date getUltimoDiaDaCompetencia() {
        if (this.dataFinal != null) {
            return HelperDate.getInstance(this.dataFinal).lastDayOfTheMonth().getDate();
        }
        return HelperDate.getInstance().getDate();
    }

    public String getMascara() {
        return (Utils.naoNulo(this.divisor) ? "1" : "0") + (Utils.naoNulo(this.multiplicador) ? "1" : "0") + (Utils.naoNulo(this.quantidade) ? "1" : "0") + (Utils.naoNulo(this.dobra) ? "1" : "0") + (Utils.naoNulo(this.devido) ? "1" : "0") + (Utils.naoNulo(this.pago) ? "1" : "0") + (Utils.naoNulo(this.propQuantidade) ? "1" : "0") + (Utils.naoNulo(this.propDevido) ? "1" : "0") + (Utils.naoNulo(this.propPago) ? "1" : "0");
    }

    public FiltroParaAlterarVerbaEmLote sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.dataFinal);
        novaData.addMonth(1);
        this.setDataInicial(novaData.getDate());
        this.setDataFinal(novaData.getDate());
        return this;
    }
}

