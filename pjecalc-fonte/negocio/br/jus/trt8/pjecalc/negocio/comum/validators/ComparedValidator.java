/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.util.Eval
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.Compared;
import groovy.util.Eval;

public class ComparedValidator
extends CustomValidator<Compared> {
    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMessage() {
        return ((Compared)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((Compared)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((Compared)this.getAnnotation()).condition();
    }

    private Object getWithObject() {
        return Eval.me((String)"bean", (Object)this.getBean(), (String)String.format("bean.%s", ((Compared)this.getAnnotation()).with()));
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        boolean result;
        Object value = context.getValue();
        Object withObject = this.getWithObject();
        if (value == null || withObject == null) {
            return true;
        }
        Comparable comparable1 = (Comparable)value;
        Comparable comparable2 = (Comparable)withObject;
        boolean bl = result = comparable1.compareTo(comparable2) == ((Compared)this.getAnnotation()).result();
        return ((Compared)this.getAnnotation()).not() ? !result : result;
    }
}

