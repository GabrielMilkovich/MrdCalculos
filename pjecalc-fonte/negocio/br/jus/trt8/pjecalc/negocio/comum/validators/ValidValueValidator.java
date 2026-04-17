/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import java.util.HashMap;
import java.util.Map;

public class ValidValueValidator
extends CustomValidator<ValidValue> {
    private ValidRule validRule;
    private Map<String, Object> parameters = new HashMap<String, Object>();

    @Override
    public Object getParameter(String key) {
        if (this.getAnnotationParameters().length > 0) {
            for (int i = 0; i < this.getAnnotationParameters().length; ++i) {
                if (!Integer.valueOf(i).toString().equals(key.trim())) continue;
                return this.getAnnotationParameters()[i];
            }
        } else {
            return this.getParameters().get(key);
        }
        return null;
    }

    @Override
    public String getMessage() {
        if (Utils.naoNulo(this.validRule)) {
            return this.validRule.getMessage().name();
        }
        return ((ValidValue)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((ValidValue)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((ValidValue)this.getAnnotation()).condition();
    }

    public String[] getAnnotationParameters() {
        return ((ValidValue)this.getAnnotation()).parameters();
    }

    public int getFlag() {
        return ((ValidValue)this.getAnnotation()).flag();
    }

    public Map<String, Object> getParameters() {
        return this.parameters;
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        try {
            this.validRule = ((ValidValue)this.getAnnotation()).validRule().newInstance();
            return this.validRule.isValid(this, context);
        }
        catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}

