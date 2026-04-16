/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.validator.ClassValidator
 *  org.hibernate.validator.InvalidValue
 *  org.hibernate.validator.MessageInterpolator
 *  org.hibernate.validator.Validator
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ResourceBundleWrapper;
import java.util.List;
import java.util.ResourceBundle;
import org.hibernate.validator.ClassValidator;
import org.hibernate.validator.InvalidValue;
import org.hibernate.validator.MessageInterpolator;
import org.hibernate.validator.Validator;

public class CustomClassValidator<T>
extends ClassValidator<T>
implements MessageInterpolator {
    private static final String MEMBERS_VALIDATORS_ATTRIBUTE = "memberValidators";
    private static final String MESSAGE_BUNDLE_ATTRIBUTE = "messageBundle";
    private static final String USER_INTERPOLATOR_ATTRIBUTE = "userInterpolator";
    private static final long serialVersionUID = -1085412895535294020L;
    private CustomValidator<?> currentCustomValidator;

    public CustomClassValidator(Class<T> beanClass, ResourceBundle resourceBundle) {
        super(beanClass, (ResourceBundle)new ResourceBundleWrapper(null, resourceBundle));
        ResourceBundleWrapper resourceBundleWrapper = (ResourceBundleWrapper)Utils.getPropertyByReflection(((Object)((Object)this)).getClass().getSuperclass(), (Object)this, MESSAGE_BUNDLE_ATTRIBUTE);
        resourceBundleWrapper.setCustomClassValidator(this);
        Utils.setPropertyByReflection(((Object)((Object)this)).getClass().getSuperclass(), (Object)this, USER_INTERPOLATOR_ATTRIBUTE, (Object)this);
    }

    public String interpolate(String message, Validator validator, MessageInterpolator defaultInterpolator) {
        this.currentCustomValidator = null;
        if (validator instanceof CustomValidator) {
            this.currentCustomValidator = (CustomValidator)validator;
            String msg = this.currentCustomValidator.getMessage();
            message = Utils.naoNulo(msg) && msg.startsWith("{") ? msg : String.format("{%s}", msg);
        }
        return defaultInterpolator.interpolate(message, validator, null);
    }

    private boolean isEL(String value) {
        return value.matches("\\{.*\\}");
    }

    public Object getParameter(String key) {
        if (this.currentCustomValidator == null) {
            return null;
        }
        Object value = this.currentCustomValidator.getParameter(key);
        if (value == null) {
            return null;
        }
        if (this.isEL(value.toString())) {
            return value;
        }
        String path = Utils.formatarNomeDeAtributo(this.currentCustomValidator.getBean().getClass().getSimpleName(), value.toString());
        return String.format("{%s}", path);
    }

    private void bindBean(T bean) {
        List<Validator> memberValidators = this.getMemberValidators();
        for (Validator validator : memberValidators) {
            if (!(validator instanceof CustomValidator)) continue;
            ((CustomValidator)validator).setBean(bean);
        }
    }

    public InvalidValue[] getInvalidValues(T bean, String propertyName) {
        this.bindBean(bean);
        return super.getInvalidValues(bean, propertyName);
    }

    public InvalidValue[] getInvalidValues(T bean) {
        this.bindBean(bean);
        return super.getInvalidValues(bean);
    }

    private List<Validator> getMemberValidators() {
        return (List)Utils.getPropertyByReflection(((Object)((Object)this)).getClass().getSuperclass(), (Object)this, MEMBERS_VALIDATORS_ATTRIBUTE);
    }
}

