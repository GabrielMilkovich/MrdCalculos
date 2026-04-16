/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;

public class FormatadorPad
implements IFormatador {
    private Integer tamanho;
    private static final long serialVersionUID = 5306013528774089200L;

    public FormatadorPad(Integer tamanho) {
        this.tamanho = tamanho;
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        if (valor == null || valor.isEmpty()) {
            return null;
        }
        return Integer.parseInt(valor);
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        StringBuilder buffer = new StringBuilder(valor == null ? "" : valor.toString());
        if (this.tamanho != null) {
            while (buffer.length() < this.tamanho) {
                buffer.insert(0, "0");
            }
        }
        return buffer.toString();
    }

    public void setTamanho(Integer tamanho) {
        this.tamanho = tamanho;
    }
}

