/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.exceptions;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;

public class InfraException
extends RuntimeException {
    private static final long serialVersionUID = 7650691540300823076L;
    private final MensagemDeRecurso mensagemDeErro;

    public InfraException(MensagemDeRecurso mensagemDeRecurso) {
        this(null, mensagemDeRecurso);
    }

    public InfraException(Throwable causa, MensagemDeRecurso mensagemDeRecurso) {
        super(causa);
        this.mensagemDeErro = mensagemDeRecurso;
    }

    public InfraException(Throwable causa) {
        this(causa, null);
    }

    public MensagemDeRecurso getMensagemDeRecurso() {
        return this.mensagemDeErro;
    }
}

