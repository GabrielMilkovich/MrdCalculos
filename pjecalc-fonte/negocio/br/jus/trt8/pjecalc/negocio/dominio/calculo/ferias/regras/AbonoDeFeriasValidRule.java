/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.regras;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;

public class AbonoDeFeriasValidRule
implements ValidRule {
    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0004;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Boolean abono = (Boolean)context.getValue();
        if (Utils.nulo(abono)) {
            return true;
        }
        Ferias ferias = (Ferias)context.getBean();
        if (abono.booleanValue()) {
            return SituacaoDaFeriasEnum.GOZADAS.equals((Object)ferias.getSituacao()) || SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE.equals((Object)ferias.getSituacao());
        }
        return true;
    }
}

