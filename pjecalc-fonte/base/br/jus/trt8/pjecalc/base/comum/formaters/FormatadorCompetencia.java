/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;
import java.text.SimpleDateFormat;

public class FormatadorCompetencia
implements IFormatador {
    private static final long serialVersionUID = 1839472056195643849L;
    private static FormatadorCompetencia instancia;

    private FormatadorCompetencia() {
    }

    public static synchronized FormatadorCompetencia getInstance() {
        if (instancia == null) {
            instancia = new FormatadorCompetencia();
        }
        return instancia;
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        if (Utils.nuloOuBranco(valor)) {
            return null;
        }
        SimpleDateFormat format = new SimpleDateFormat("dd/MM/yyyy");
        return format.format("01/" + valor);
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        if (Utils.nulo(valor)) {
            return "";
        }
        SimpleDateFormat format = new SimpleDateFormat("MM/yyyy");
        return format.format(valor);
    }
}

