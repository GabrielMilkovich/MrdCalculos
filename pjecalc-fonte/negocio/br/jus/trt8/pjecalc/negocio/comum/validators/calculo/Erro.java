/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.calculo;

import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador;

public class Erro
extends MsgValidador {
    private static final long serialVersionUID = -8274501333296240441L;
    private static final String TIPO = "ERRO";

    @Override
    public boolean isImpeditivo() {
        return true;
    }

    @Override
    public String getTipo() {
        return TIPO;
    }
}

