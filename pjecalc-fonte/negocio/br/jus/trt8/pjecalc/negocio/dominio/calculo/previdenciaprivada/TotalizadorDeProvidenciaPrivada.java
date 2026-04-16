/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import java.math.BigDecimal;

public class TotalizadorDeProvidenciaPrivada {
    private PrevidenciaPrivada previdenciaPrivada;
    private boolean isCalculado;
    private Total devido;
    private Total taxaJuros;
    private Total devidoCorrigido;
    private Total juros;
    private Total total;

    public TotalizadorDeProvidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorDeProvidenciaPrivada calcular() {
        if (!this.isCalculado) {
            this.devido = Total.newInstance(true);
            this.taxaJuros = Total.newInstance(true);
            this.devidoCorrigido = Total.newInstance(true);
            this.juros = Total.newInstance(true);
            this.total = Total.newInstance(true);
            for (OcorrenciaDePrevidenciaPrivada ocorrencia : this.previdenciaPrivada.getOcorrencias()) {
                this.devido.acumular(ocorrencia.getValorDevido());
                this.taxaJuros.acumular(ocorrencia.getTaxaDeJuros());
                this.devidoCorrigido.acumular(ocorrencia.getValorDevidoCorrigido());
                this.juros.acumular(ocorrencia.getJuros());
                this.total.acumular(ocorrencia.getTotal());
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getDevido() {
        return this.calcular().devido.getValor();
    }

    public BigDecimal getTaxaJuros() {
        return this.calcular().taxaJuros.getValor();
    }

    public BigDecimal getDevidoCorrigido() {
        return this.calcular().devidoCorrigido.getValor();
    }

    public BigDecimal getJuros() {
        return this.calcular().juros.getValor();
    }

    public BigDecimal getTotal() {
        return this.calcular().total.getValor();
    }
}

