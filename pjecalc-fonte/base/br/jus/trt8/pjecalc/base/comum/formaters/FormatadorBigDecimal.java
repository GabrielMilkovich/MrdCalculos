/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.text.ParseException;
import java.util.Locale;
import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FormatadorBigDecimal
implements IFormatador {
    private static final long serialVersionUID = -8491012351345516132L;
    private final Logger logger = LoggerFactory.getLogger(FormatadorBigDecimal.class);
    protected NumberFormat nf = NumberFormat.getInstance(new Locale("pt", "BR"));

    public FormatadorBigDecimal() {
        this.nf.setMaximumFractionDigits(2);
        this.nf.setMinimumFractionDigits(2);
        this.nf.setGroupingUsed(true);
    }

    protected BigDecimal normalizarValor(String valor) {
        DecimalFormat fmt = new DecimalFormat("#,##0.00");
        fmt.setParseBigDecimal(true);
        try {
            if (valor.matches(".*[,].*[,].*")) {
                throw new NumberFormatException("For input string: \"" + valor + "\"");
            }
            if (valor.contains(".") && !valor.contains(",")) {
                valor = StringUtils.reverse((String)StringUtils.reverse((String)valor).replaceFirst("[.]", ","));
            }
            return (BigDecimal)fmt.parse(valor);
        }
        catch (ParseException e) {
            throw new NumberFormatException("For input string: \"" + valor + "\"");
        }
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        try {
            if (valor == null) {
                return null;
            }
            if ((valor = valor.trim()).length() < 1) {
                return null;
            }
            if (valor.equals("")) {
                return null;
            }
            return this.normalizarValor(valor);
        }
        catch (Exception e) {
            this.logger.error(e.getMessage(), (Throwable)e);
            throw new FormatadorException("Erro na convers\u00e3o do valor '" + valor + "'");
        }
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        if (valor == null) {
            return "";
        }
        if (valor instanceof String) {
            if (((String)valor).equals("")) {
                return "";
            }
            return this.nf.format(this.normalizarValor((String)valor));
        }
        return this.nf.format(((BigDecimal)valor).setScale(6, 6));
    }
}

