/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.util.Eval
 *  org.hibernate.validator.Validator
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.GroupValidation;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import groovy.util.Eval;
import java.lang.annotation.Annotation;
import org.hibernate.validator.Validator;
import org.jboss.seam.Component;

public abstract class CustomValidator<A extends Annotation>
implements Validator<A> {
    private static final String VALIDATION_MANAGER = "gerenciadorDeValidadores";
    private A annotation;
    private Object bean;

    public abstract boolean isValid(ValidatorContext var1);

    public abstract Object getParameter(String var1);

    public abstract byte[] getGroups();

    public abstract String getMessage();

    protected String getCondition() {
        return null;
    }

    public void initialize(A parameters) {
        this.annotation = parameters;
    }

    public A getAnnotation() {
        return this.annotation;
    }

    private boolean isInGroup(byte group) {
        if (group == 0 && this.getGroups().length == 0) {
            return true;
        }
        for (byte g : this.getGroups()) {
            if (g != group) continue;
            return true;
        }
        return false;
    }

    private Boolean condition() {
        if (Utils.nulo(this.getCondition()) || this.getCondition().isEmpty()) {
            return true;
        }
        return (Boolean)Eval.me((String)"bean", (Object)this.getBean(), (String)this.getCondition());
    }

    public boolean isValid(Object value) {
        GroupValidation groupValidation = (GroupValidation)Component.getInstance((String)VALIDATION_MANAGER);
        if (Utils.naoNulo(groupValidation) && !this.isInGroup(groupValidation.getGroup())) {
            return true;
        }
        if (!this.condition().booleanValue() && !this.getCondition().isEmpty()) {
            return true;
        }
        return this.isValid(new ValidatorContext(this.bean, value));
    }

    public Object getBean() {
        return this.bean;
    }

    public void setBean(Object bean) {
        this.bean = bean;
    }
}

