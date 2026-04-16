/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import java.io.Serializable;

public interface IFormatador
extends Serializable {
    public Object obterComoObjeto(String var1) throws FormatadorException;

    public String obterComoString(Object var1) throws FormatadorException;
}

