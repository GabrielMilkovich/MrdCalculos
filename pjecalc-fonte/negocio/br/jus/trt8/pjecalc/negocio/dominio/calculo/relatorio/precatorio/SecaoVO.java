/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.precatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSecaoRelatorioPrecatorioEnum;
import java.math.BigDecimal;

public class SecaoVO {
    private String descritivoDeEventos;
    private BigDecimal totalDevido;
    private BigDecimal totalPago;
    private BigDecimal totalDiferenca;
    private TipoSecaoRelatorioPrecatorioEnum tipoSecaoRelatorio;

    public SecaoVO(TipoSecaoRelatorioPrecatorioEnum tipo) {
        this(tipo, "");
    }

    public SecaoVO(TipoSecaoRelatorioPrecatorioEnum tipo, String descritivoDeEventos) {
        this.tipoSecaoRelatorio = tipo;
        this.descritivoDeEventos = descritivoDeEventos;
        this.totalDevido = BigDecimal.ZERO;
        this.totalPago = BigDecimal.ZERO;
        this.totalDiferenca = BigDecimal.ZERO;
    }

    public String getDescritivoDeEventos() {
        return this.descritivoDeEventos;
    }

    public void setDescritivoDeEventos(String descritivoDeEventos) {
        this.descritivoDeEventos = descritivoDeEventos;
    }

    public TipoSecaoRelatorioPrecatorioEnum getTipoSecaoRelatorio() {
        return this.tipoSecaoRelatorio;
    }

    public void setTipoSecaoRelatorio(TipoSecaoRelatorioPrecatorioEnum tipoSecaoRelatorio) {
        this.tipoSecaoRelatorio = tipoSecaoRelatorio;
    }

    public BigDecimal getTotalDevido() {
        return this.totalDevido;
    }

    public void setTotalDevido(BigDecimal totalDevido) {
        this.totalDevido = totalDevido;
    }

    public BigDecimal getTotalPago() {
        return this.totalPago;
    }

    public void setTotalPago(BigDecimal totalPago) {
        this.totalPago = totalPago;
    }

    public BigDecimal getTotalDiferenca() {
        return this.totalDiferenca;
    }

    public void setTotalDiferenca(BigDecimal totalDiferenca) {
        this.totalDiferenca = totalDiferenca;
    }

    public void incrementar(BigDecimal devido, BigDecimal pago, BigDecimal diferenca) {
        this.setTotalDevido(Utils.somar(this.getTotalDevido(), devido, this.getTotalDevido()));
        this.setTotalPago(Utils.somar(this.getTotalPago(), pago, this.getTotalPago()));
        this.setTotalDiferenca(Utils.somar(this.getTotalDiferenca(), diferenca, this.getTotalDiferenca()));
    }
}

