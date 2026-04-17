/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.Min;
import java.math.BigDecimal;
import java.math.BigInteger;

public class MinValidator
extends CustomValidator<Min> {
    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMessage() {
        return ((Min)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((Min)this.getAnnotation()).groups();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value = context.getValue();
        if (value == null) {
            return true;
        }
        BigDecimal min = new BigDecimal(((Min)this.getAnnotation()).value());
        if (value instanceof String) {
            try {
                return new BigDecimal((String)value).compareTo(BigDecimal.valueOf(min.intValue())) >= 0;
            }
            catch (NumberFormatException nfe) {
                return false;
            }
        }
        if (value instanceof Double || value instanceof Float) {
            double dv = ((Number)value).doubleValue();
            return dv >= min.doubleValue();
        }
        if (value instanceof BigInteger) {
            return ((BigInteger)value).compareTo(BigInteger.valueOf(min.intValue())) >= 0;
        }
        if (value instanceof BigDecimal) {
            return ((BigDecimal)value).compareTo(min) >= 0;
        }
        if (value instanceof Number) {
            long lv = ((Number)value).longValue();
            return lv >= min.longValue();
        }
        return false;
    }
}

