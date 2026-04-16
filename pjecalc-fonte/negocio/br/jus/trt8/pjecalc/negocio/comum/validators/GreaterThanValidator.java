/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterThan;
import java.math.BigDecimal;
import java.util.Date;

public class GreaterThanValidator
extends CustomValidator<GreaterThan> {
    private static final String COMPARED_KEY = "1";

    @Override
    public Object getParameter(String key) {
        if (key.equals(COMPARED_KEY)) {
            return ((GreaterThan)this.getAnnotation()).value();
        }
        return null;
    }

    @Override
    public String getMessage() {
        return ((GreaterThan)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((GreaterThan)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((GreaterThan)this.getAnnotation()).condition();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value1 = context.getValue();
        Object value2 = context.getMemberValue(((GreaterThan)this.getAnnotation()).value());
        if (Utils.nulo(value1) || Utils.nulo(value2)) {
            return true;
        }
        if (value1 instanceof Date && value2 instanceof Date) {
            return HelperDate.dateBefore((Date)value2, (Date)value1);
        }
        if (value1 instanceof BigDecimal && value2 instanceof BigDecimal) {
            return ((BigDecimal)value1).compareTo((BigDecimal)value2) > 0;
        }
        return true;
    }
}

