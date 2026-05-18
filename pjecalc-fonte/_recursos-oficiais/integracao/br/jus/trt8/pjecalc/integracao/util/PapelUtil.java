/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.util;

import java.util.ResourceBundle;

public class PapelUtil {
    public static String[] getPapeisPermitidos() {
        ResourceBundle bundle = ResourceBundle.getBundle("papeis_permitidos");
        String valor = bundle.getString("pjekz.papeisPermitidos");
        return valor.split("[,]");
    }
}

