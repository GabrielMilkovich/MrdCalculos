/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.rules;

import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;

public class DefaultValidRule
implements ValidRule {
    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0004;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        return false;
    }
}

