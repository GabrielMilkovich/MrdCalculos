/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;
import java.text.ParseException;
import javax.swing.text.MaskFormatter;

public class FormatadorCNPJ
implements IFormatador {
    private static final long serialVersionUID = 8761392425194223984L;
    private static FormatadorCNPJ instancia;
    private static final int TAMANHO_CNPJ_SOMENTE_NUMEROS = 14;

    private FormatadorCNPJ() {
    }

    public static synchronized FormatadorCNPJ getInstance() {
        if (instancia == null) {
            instancia = new FormatadorCNPJ();
        }
        return instancia;
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        if (valor != null) {
            valor = valor.replace(".", "").replace("-", "").replace("/", "").replace("_", "");
        }
        return valor;
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        try {
            if (valor != null && valor.toString().length() == 14) {
                MaskFormatter mf = new MaskFormatter("##.###.###/####-##");
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

