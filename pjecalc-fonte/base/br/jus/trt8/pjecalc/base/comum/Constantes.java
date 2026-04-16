/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import java.math.BigDecimal;
import java.util.Date;

public final class Constantes {
    public static final String STR = " ";
    public static final String STR_E = " E ";
    public static final String STR_SOBRE = " SOBRE ";
    public static final String STR_VIRGULA = ", ";
    public static final String STR_TRACO = " - ";
    public static final BigDecimal QUANTIDADE_PADRAO_AVISO_PREVIO = new BigDecimal("30");
    public static final int QUANTIDADE_MAXIMA_DE_HISTORICOS = 15;
    public static final Date DATA_LIMITE_COM_DEMISSAO_PARA_AVISO_PREVIO_CALCULADO = HelperDate.getInstance(2011, 9, 13).getDate();
    public static final Date DATA_REFORMA_TRABALHISTA = HelperDate.getInstance(2017, 10, 11).getDate();
    public static final Date DATA_REFORMA_PREVIDENCIA = HelperDate.getInstance(2020, 2, 1).getDate();

    private Constantes() {
    }
}

