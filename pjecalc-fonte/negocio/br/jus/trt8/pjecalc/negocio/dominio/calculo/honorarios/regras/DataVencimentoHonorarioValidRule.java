/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import java.util.Date;

public class DataVencimentoHonorarioValidRule
implements ValidRule {
    private static final String DATA_HOJE = "dataHoje";
    private static final String DATA_ADMISSAO_CALCULO = "calculo.dataAdmissao";
    private int flag = 0;

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Honorario honorario = (Honorario)context.getBean();
        Date vencimento = honorario.getDataVencimento();
        if (Utils.nulo(vencimento)) {
            return true;
        }
        Calculo calculo = honorario.getCalculo();
        if (Utils.naoNulo(calculo.getDataAdmissao()) && HelperDate.dateBefore(vencimento, calculo.getDataAdmissao())) {
            validator.getParameters().put("1", DATA_ADMISSAO_CALCULO);
            return false;
        }
        HelperDate hoje = HelperDate.getInstance();
        hoje.removeTime();
        if (hoje.lessThen(vencimento)) {
            this.flag = 1;
            validator.getParameters().put("1", DATA_HOJE);
            return false;
        }
        return true;
    }

    @Override
    public Mensagens getMessage() {
        if (this.flag == 0) {
            return Mensagens.MSG0008;
        }
        return Mensagens.MSG0010;
    }
}

