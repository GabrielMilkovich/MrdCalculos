/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;

public class RequiredValidator
extends CustomValidator<Required> {
    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMessage() {
        return ((Required)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((Required)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((Required)this.getAnnotation()).condition();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value = context.getValue();
        if (value == null) {
            return false;
        }
        if (value.getClass().isArray()) {
            return Array.getLength(value) > 0;
        }
        if (value instanceof Collection) {
            return !((Collection)value).isEmpty();
        }
        if (value instanceof Map) {
            return !((Map)value).isEmpty();
        }
        return !value.toString().equals("");
    }
}

