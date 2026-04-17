/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.util.Eval
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import groovy.util.Eval;

public class ValidatorContext {
    private Object bean;
    private Object value;

    public ValidatorContext(Object bean, Object value) {
        this.bean = bean;
        this.value = value;
    }

    public Object getMemberValue(String attributeName) {
        return Eval.me((String)"bean", (Object)this.getBean(), (String)("bean." + attributeName));
    }

    public Object getBean() {
        return this.bean;
    }

    public Object getValue() {
        return this.value;
    }
}

