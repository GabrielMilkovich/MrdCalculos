/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.util.Eval
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import groovy.util.Eval;

public class UniqueValidator
extends CustomValidator<Unique> {
    @Override
    public Object getParameter(String key) {
        return null;
    }

    @Override
    public String getMessage() {
        return ((Unique)this.getAnnotation()).message();
    }

    @Override
    public byte[] getGroups() {
        return ((Unique)this.getAnnotation()).groups();
    }

    @Override
    protected String getCondition() {
        return ((Unique)this.getAnnotation()).condition();
    }

    private Object getAtributeValue(String name) {
        return Eval.me((String)"bean", (Object)this.getBean(), (String)String.format("bean.%s", name));
    }

    @Override
    public boolean isValid(ValidatorContext context) {
        if (context.getValue() == null) {
            return true;
        }
        Object[] values = new Object[((Unique)this.getAnnotation()).fields().length];
        for (int i = 0; i < values.length; ++i) {
            values[i] = this.getAtributeValue(((Unique)this.getAnnotation()).fields()[i]);
        }
        EntidadeBase entidade = (EntidadeBase)this.getBean();
        return !RepositorioBase.isDuplicado(entidade, ((Unique)this.getAnnotation()).fields(), values);
    }
}

