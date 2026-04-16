/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.exceptions;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;

public abstract class MapeadaException
extends NegocioException {
    private static final long serialVersionUID = 4034757286710822200L;

    public MapeadaException(Throwable causa) {
        super(causa, null);
    }

    public void tratarMensagem(MensagemDeRecurso mensagem, RuntimeException re) {
    }

    public abstract boolean casar(RuntimeException var1);
}

