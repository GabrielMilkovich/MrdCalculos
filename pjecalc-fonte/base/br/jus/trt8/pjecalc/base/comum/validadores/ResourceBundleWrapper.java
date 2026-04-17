/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import br.jus.trt8.pjecalc.base.comum.validadores.CustomClassValidator;
import java.util.Enumeration;
import java.util.ResourceBundle;

public class ResourceBundleWrapper
extends ResourceBundle {
    private ResourceBundle resourceBundle;
    private CustomClassValidator<?> customClassValidator;

    public ResourceBundleWrapper(CustomClassValidator<?> customClassValidator, ResourceBundle resourceBundle) {
        this.customClassValidator = customClassValidator;
        this.resourceBundle = resourceBundle;
    }

    @Override
    protected Object handleGetObject(String key) {
        Object object = this.customClassValidator.getParameter(key);
        if (object != null) {
            return object;
        }
        return this.resourceBundle.getObject(key);
    }

    @Override
    public Enumeration<String> getKeys() {
        return this.resourceBundle.getKeys();
    }

    public void setCustomClassValidator(CustomClassValidator<?> customClassValidator) {
        this.customClassValidator = customClassValidator;
    }
}

