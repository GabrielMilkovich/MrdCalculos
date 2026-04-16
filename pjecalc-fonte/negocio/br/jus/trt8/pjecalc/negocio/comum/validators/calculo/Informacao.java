/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.calculo;

import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador;

public class Informacao
extends MsgValidador {
    private static final long serialVersionUID = 3494106834486138465L;
    private static final String TIPO = "INFO";

    @Override
    public boolean isImpeditivo() {
        return false;
    }

    @Override
    public String getTipo() {
        return TIPO;
    }
}

