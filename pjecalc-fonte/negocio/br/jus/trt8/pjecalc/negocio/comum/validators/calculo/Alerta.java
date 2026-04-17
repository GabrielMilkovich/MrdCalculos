/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.calculo;

import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador;

public class Alerta
extends MsgValidador {
    private static final long serialVersionUID = -5647914041529242456L;
    private static final String TIPO = "ALERTA";

    @Override
    public boolean isImpeditivo() {
        return false;
    }

    @Override
    public String getTipo() {
        return TIPO;
    }
}

