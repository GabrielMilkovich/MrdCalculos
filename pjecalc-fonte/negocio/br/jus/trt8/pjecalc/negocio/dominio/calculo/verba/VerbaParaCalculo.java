/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.verba;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;

public class VerbaParaCalculo {
    private Verba verba;
    private Boolean selecionada;

    public VerbaParaCalculo() {
    }

    public VerbaParaCalculo(Verba verba) {
        this();
        this.verba = verba;
    }

    public VerbaParaCalculo selecionarA(Verba verba) {
        this.verba = verba;
        this.setSelecionada(Boolean.TRUE);
        return this;
    }

    public String getNome() {
        return Utils.nulo(this.verba) ? null : this.verba.getNome();
    }

    public Boolean getSelecionada() {
        return this.selecionada;
    }

    public void setSelecionada(Boolean selecionada) {
        this.selecionada = selecionada;
    }

    protected void setVerba(Verba verba) {
        this.verba = verba;
    }

    public Verba getVerba() {
        return this.verba;
    }
}

