/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;
import java.text.ParseException;
import javax.swing.text.MaskFormatter;

public class FormatadorCPF
implements IFormatador {
    private static final long serialVersionUID = 7612141545205630611L;
    private static final int TAMANHO_CPF_SOMENTE_NUMEROS = 11;
    private static FormatadorCPF instancia;

    private FormatadorCPF() {
    }

    public static synchronized FormatadorCPF getInstance() {
        if (instancia == null) {
            instancia = new FormatadorCPF();
        }
        return instancia;
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        valor = valor.replace(".", "").replace("-", "").replace("_", "");
        return valor;
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        try {
            if (valor != null && valor.toString().length() == 11) {
                MaskFormatter mf = new MaskFormatter("###.###.###-##");
                mf.setValueContainsLiteralCharacters(false);
                return mf.valueToString(valor);
            }
            return "";
        }
        catch (ParseException e) {
            throw new FormatadorException(e.getMessage(), e);
        }
    }
}

