/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import java.math.BigDecimal;

public class TotalizadorInssSobreSalarios {
    private InssSobreSalarios inssSobreSalarios;
    private boolean isCalculado;
    private Total seguradoReclamadoCorrigido;
    private Total jurosSeguradoReclamadoCorrigido;
    private Total multaSeguradoReclamadoCorrigido;
    private Total totalSeguradoReclamadoCorrigido;
    private Total empresaFinalCorrigido;
    private Total jurosEmpresaFinalCorrigido;
    private Total multaEmpresaFinalCorrigido;
    private Total totalEmpresaFinalCorrigido;
    private Total satCorrigido;
    private Total jurosSatCorrigido;
    private Total multaSatCorrigido;
    private Total totalSatCorrigido;
    private Total terceirosCorrigido;
    private Total jurosTerceirosCorrigido;
    private Total multaTerceirosCorrigido;
    private Total totalTerceirosCorrigido;

    public TotalizadorInssSobreSalarios(InssSobreSalarios inssSobreSalarios) {
        this.inssSobreSalarios = inssSobreSalarios;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorInssSobreSalarios calcular() {
        if (!this.isCalculado) {
            this.seguradoReclamadoCorrigido = Total.newInstance(true);
            this.jurosSeguradoReclamadoCorrigido = Total.newInstance(true);
            this.multaSeguradoReclamadoCorrigido = Total.newInstance(true);
            this.totalSeguradoReclamadoCorrigido = Total.newInstance(true);
            this.empresaFinalCorrigido = Total.newInstance(true);
            this.jurosEmpresaFinalCorrigido = Total.newInstance(true);
            this.multaEmpresaFinalCorrigido = Total.newInstance(true);
            this.totalEmpresaFinalCorrigido = Total.newInstance(true);
            this.satCorrigido = Total.newInstance(true);
            this.jurosSatCorrigido = Total.newInstance(true);
            this.multaSatCorrigido = Total.newInstance(true);
            this.totalSatCorrigido = Total.newInstance(true);
            this.terceirosCorrigido = Total.newInstance(true);
            this.jurosTerceirosCorrigido = Total.newInstance(true);
            this.multaTerceirosCorrigido = Total.newInstance(true);
            this.totalTerceirosCorrigido = Total.newInstance(true);
            for (OcorrenciaDeInss ocorrenciaDeInss : this.inssSobreSalarios.getOcorrencias()) {
                if (ocorrenciaDeInss.isBaseVazia().booleanValue()) continue;
                if (Utils.naoNulo(ocorrenciaDeInss.getValorDevidoSeguradoFinalCorrigido())) {
                    this.seguradoReclamadoCorrigido.acumular(ocorrenciaDeInss.getValorDevidoSeguradoFinalCorrigido());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getJurosValorDevidoSeguradoFinal())) {
                    this.jurosSeguradoReclamadoCorrigido.acumular(ocorrenciaDeInss.getJurosValorDevidoSeguradoFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getMultaValorDevidoSeguradoFinal())) {
                    this.multaSeguradoReclamadoCorrigido.acumular(ocorrenciaDeInss.getMultaValorDevidoSeguradoFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getTotalValorDevidoSeguradoFinal())) {
                    this.totalSeguradoReclamadoCorrigido.acumular(ocorrenciaDeInss.getTotalValorDevidoSeguradoFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getValorDevidoEmpresaFinalCorrigido())) {
                    this.empresaFinalCorrigido.acumular(ocorrenciaDeInss.getValorDevidoEmpresaFinalCorrigido());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getJurosValorDevidoEmpresaFinal())) {
                    this.jurosEmpresaFinalCorrigido.acumular(ocorrenciaDeInss.getJurosValorDevidoEmpresaFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getMultaValorDevidoEmpresaFinal())) {
                    this.multaEmpresaFinalCorrigido.acumular(ocorrenciaDeInss.getMultaValorDevidoEmpresaFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getTotalValorDevidoEmpresaFinal())) {
                    this.totalEmpresaFinalCorrigido.acumular(ocorrenciaDeInss.getTotalValorDevidoEmpresaFinal());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getValorDevidoSATCorrigido())) {
                    this.satCorrigido.acumular(ocorrenciaDeInss.getValorDevidoSATCorrigido());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getJurosValorDevidoSAT())) {
                    this.jurosSatCorrigido.acumular(ocorrenciaDeInss.getJurosValorDevidoSAT());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getMultaValorDevidoSAT())) {
                    this.multaSatCorrigido.acumular(ocorrenciaDeInss.getMultaValorDevidoSAT());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getTotalValorDevidoSAT())) {
                    this.totalSatCorrigido.acumular(ocorrenciaDeInss.getTotalValorDevidoSAT());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getValorDevidoTerceirosCorrigido())) {
                    this.terceirosCorrigido.acumular(ocorrenciaDeInss.getValorDevidoTerceirosCorrigido());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getJurosValorDevidoTerceiros())) {
                    this.jurosTerceirosCorrigido.acumular(ocorrenciaDeInss.getJurosValorDevidoTerceiros());
                }
                if (Utils.naoNulo(ocorrenciaDeInss.getMultaValorDevidoTerceiros())) {
                    this.multaTerceirosCorrigido.acumular(ocorrenciaDeInss.getMultaValorDevidoTerceiros());
                }
                if (!Utils.naoNulo(ocorrenciaDeInss.getTotalValorDevidoTerceiros())) continue;
                this.totalTerceirosCorrigido.acumular(ocorrenciaDeInss.getTotalValorDevidoTerceiros());
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getSeguradoReclamadoCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().seguradoReclamadoCorrigido.getValor());
    }

    public BigDecimal getJurosSeguradoReclamadoCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().jurosSeguradoReclamadoCorrigido.getValor());
    }

    public BigDecimal getMultaSeguradoReclamadoCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().multaSeguradoReclamadoCorrigido.getValor());
    }

    public BigDecimal getTotalSeguradoReclamadoCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().totalSeguradoReclamadoCorrigido.getValor());
    }

    public BigDecimal getEmpresaFinalCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().empresaFinalCorrigido.getValor());
    }

    public BigDecimal getJurosEmpresaFinalCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().jurosEmpresaFinalCorrigido.getValor());
    }

    public BigDecimal getMultaEmpresaFinalCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().multaEmpresaFinalCorrigido.getValor());
    }

    public BigDecimal getTotalEmpresaFinalCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().totalEmpresaFinalCorrigido.getValor());
    }

    public BigDecimal getSatCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().satCorrigido.getValor());
    }

    public BigDecimal getJurosSatCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().jurosSatCorrigido.getValor());
    }

    public BigDecimal getMultaSatCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().multaSatCorrigido.getValor());
    }

    public BigDecimal getTotalSatCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().totalSatCorrigido.getValor());
    }

    public BigDecimal getTerceirosCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().terceirosCorrigido.getValor());
    }

    public BigDecimal getJurosTerceirosCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().jurosTerceirosCorrigido.getValor());
    }

    public BigDecimal getMultaTerceirosCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().multaTerceirosCorrigido.getValor());
    }

    public BigDecimal getTotalTerceirosCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().totalTerceirosCorrigido.getValor());
    }
}

