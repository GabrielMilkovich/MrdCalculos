/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import java.math.BigDecimal;
import java.util.Collection;

public class TotalizadorOcorrenciaDeInssAtualizacao {
    private Collection<? extends OcorrenciaDeInssAtualizacao> ocorrencias;
    private boolean isCalculado;
    private Total devidoCorrigido;
    private Total juros;
    private Total multa;
    private Total total;
    private Total pago;
    private Total devidoCorrigidoDiferenca;
    private Total jurosDiferenca;
    private Total multaDiferenca;
    private Total totalDiferenca;

    public TotalizadorOcorrenciaDeInssAtualizacao(Collection<? extends OcorrenciaDeInssAtualizacao> ocorrencias) {
        this.ocorrencias = ocorrencias;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorOcorrenciaDeInssAtualizacao calcular() {
        if (!this.isCalculado) {
            this.devidoCorrigido = Total.newInstance(true);
            this.juros = Total.newInstance(true);
            this.multa = Total.newInstance(true);
            this.total = Total.newInstance(true);
            this.pago = Total.newInstance(true);
            this.devidoCorrigidoDiferenca = Total.newInstance(true);
            this.jurosDiferenca = Total.newInstance(true);
            this.multaDiferenca = Total.newInstance(true);
            this.totalDiferenca = Total.newInstance(true);
            for (OcorrenciaDeInssAtualizacao ocorrenciaDeInssAtualizacao : this.ocorrencias) {
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getDevidoCorrigido())) {
                    this.devidoCorrigido.acumular(ocorrenciaDeInssAtualizacao.getDevidoCorrigido());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getJuros())) {
                    this.juros.acumular(ocorrenciaDeInssAtualizacao.getJuros());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getMulta())) {
                    this.multa.acumular(ocorrenciaDeInssAtualizacao.getMulta());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getTotal())) {
                    this.total.acumular(ocorrenciaDeInssAtualizacao.getTotal());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getPago())) {
                    this.pago.acumular(ocorrenciaDeInssAtualizacao.getPago());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getDevidoDiferenca())) {
                    this.devidoCorrigidoDiferenca.acumular(ocorrenciaDeInssAtualizacao.getDevidoDiferenca());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getJurosDiferenca())) {
                    this.jurosDiferenca.acumular(ocorrenciaDeInssAtualizacao.getJurosDiferenca());
                }
                if (Utils.naoNulo(ocorrenciaDeInssAtualizacao.getMultaDiferenca())) {
                    this.multaDiferenca.acumular(ocorrenciaDeInssAtualizacao.getMultaDiferenca());
                }
                if (!Utils.naoNulo(ocorrenciaDeInssAtualizacao.getTotalDiferenca())) continue;
                this.totalDiferenca.acumular(ocorrenciaDeInssAtualizacao.getTotalDiferenca());
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getDevidoCorrigido() {
        return Utils.arredondarValorMonetario(this.calcular().devidoCorrigido.getValor());
    }

    public BigDecimal getJuros() {
        return Utils.arredondarValorMonetario(this.calcular().juros.getValor());
    }

    public BigDecimal getMulta() {
        return Utils.arredondarValorMonetario(this.calcular().multa.getValor());
    }

    public BigDecimal getTotal() {
        return Utils.arredondarValorMonetario(this.calcular().total.getValor());
    }

    public BigDecimal getPago() {
        return Utils.arredondarValorMonetario(this.calcular().pago.getValor());
    }

    public BigDecimal getDevidoCorrigidoDiferenca() {
        return Utils.arredondarValorMonetario(this.calcular().devidoCorrigidoDiferenca.getValor());
    }

    public BigDecimal getJurosDiferenca() {
        return Utils.arredondarValorMonetario(this.calcular().jurosDiferenca.getValor());
    }

    public BigDecimal getMultaDiferenca() {
        return Utils.arredondarValorMonetario(this.calcular().multaDiferenca.getValor());
    }

    public BigDecimal getTotalDiferenca() {
        return Utils.arredondarValorMonetario(this.calcular().totalDiferenca.getValor());
    }
}

