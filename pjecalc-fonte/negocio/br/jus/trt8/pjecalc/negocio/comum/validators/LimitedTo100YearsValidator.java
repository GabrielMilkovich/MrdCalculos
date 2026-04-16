/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.base.dominio.Data;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import java.util.Date;

public class LimitedTo100YearsValidator
extends CustomValidator<LimitedTo100Years> {
    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMessage() {
        return ((LimitedTo100Years)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((LimitedTo100Years)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((LimitedTo100Years)this.getAnnotation()).condition();
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        Object value = context.getValue();
        if (Utils.nulo(value)) {
            return Boolean.TRUE;
        }
        Data periodo = Data.dataComValor((Date)value);
        return !periodo.isAnteriorACemAnos() && !periodo.isPosteriorACemAnos();
    }
}

