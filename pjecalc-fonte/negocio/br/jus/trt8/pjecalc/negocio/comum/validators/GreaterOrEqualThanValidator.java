/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import java.util.Date;

public class GreaterOrEqualThanValidator
extends CustomValidator<GreaterOrEqualThan> {
    private static final String COMPARED_KEY = "1";

    @Override
    public Object getParameter(String key) {
        if (key.equals(COMPARED_KEY)) {
            return ((GreaterOrEqualThan)this.getAnnotation()).value();
        }
        return null;
    }

    @Override
    public String getMessage() {
        return ((GreaterOrEqualThan)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((GreaterOrEqualThan)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((GreaterOrEqualThan)this.getAnnotation()).condition();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value1 = context.getValue();
        Object value2 = context.getMemberValue(((GreaterOrEqualThan)this.getAnnotation()).value());
        if (Utils.nulo(value1) || Utils.nulo(value2)) {
            return true;
        }
        return HelperDate.dateBeforeOrEquals((Date)value2, (Date)value1);
    }
}

