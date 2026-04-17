/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.rules;

import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import java.math.BigDecimal;

public class ValorOutroDivisorValidRule
implements ValidRule {
    @Override
    public Mensagens getMessage() {
        return null;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Verba bean = (Verba)context.getBean();
        return bean.getDivisor() != DivisorDeVerbaEnum.OUTRO_VALOR || bean.getOutroDivisor().compareTo(BigDecimal.ZERO) > 0;
    }
}

