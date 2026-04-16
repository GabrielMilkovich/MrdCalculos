/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.LessOrEqualThan;
import java.util.Date;

public class LessOrEqualThanValidator
extends CustomValidator<LessOrEqualThan> {
    private static final String COMPARED_KEY = "1";

    @Override
    public Object getParameter(String key) {
        if (key.equals(COMPARED_KEY)) {
            return ((LessOrEqualThan)this.getAnnotation()).value();
        }
        return null;
    }

    @Override
    public String getMessage() {
        return ((LessOrEqualThan)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((LessOrEqualThan)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((LessOrEqualThan)this.getAnnotation()).condition();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value1 = context.getValue();
        Object value2 = context.getMemberValue(((LessOrEqualThan)this.getAnnotation()).value());
        if (Utils.nulo(value1) || Utils.nulo(value2)) {
            return true;
        }
        return HelperDate.dateAfterOrEquals((Date)value2, (Date)value1);
    }
}

