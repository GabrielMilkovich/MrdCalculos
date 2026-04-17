/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import java.math.BigDecimal;

public class DiasDeAbonoValidRule
implements ValidRule {
    private static final BigDecimal TERCA_PARTE_DO_PRAZO = new BigDecimal("3");

    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0175;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Integer diasAbono = (Integer)context.getValue();
        Ferias ferias = (Ferias)context.getBean();
        if (Utils.nulo(diasAbono) || !ferias.getAbono().booleanValue()) {
            return true;
        }
        return BigDecimal.ZERO.compareTo(Utils.subtrair(new BigDecimal(diasAbono), Utils.dividir(new BigDecimal(ferias.getPrazo()), TERCA_PARTE_DO_PRAZO))) >= 0;
    }
}

