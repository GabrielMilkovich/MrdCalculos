/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.exception;

public class AutenticacaoException
extends Exception {
    private static final long serialVersionUID = 1L;

    public AutenticacaoException() {
    }

    public AutenticacaoException(String message) {
        super(message);
    }

    public AutenticacaoException(String message, Throwable t) {
        super(t);
    }
}

