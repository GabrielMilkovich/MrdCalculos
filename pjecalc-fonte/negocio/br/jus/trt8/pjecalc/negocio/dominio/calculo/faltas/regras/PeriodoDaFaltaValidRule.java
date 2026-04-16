/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;

public class PeriodoDaFaltaValidRule
implements ValidRule {
    public static final int DATA_INICIAL = 0;
    public static final int DATA_FINAL = 1;
    private static final String DATA_INICIO_CALCULO = "calculo.dataInicioCalculo";
    private static final String DATA_TERMINO_CALCULO = "calculo.dataTerminoCalculo";
    private static final String DATA_ADMISSAO_CALCULO = "calculo.dataAdmissao";
    private static final String DATA_DEMISSAO_CALCULO = "calculo.dataDemissao";
    private int flag = 1;

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Falta falta = (Falta)context.getBean();
        Calculo calculo = falta.getCalculo();
        this.flag = validator.getFlag();
        if (validator.getFlag() == 0) {
            if (Utils.naoNulo(calculo.getDataAdmissao())) {
                if (!HelperDate.dateAfterOrEquals(falta.getDataInicioPeriodoFalta(), calculo.getDataAdmissao())) {
                    validator.getParameters().put("1", DATA_ADMISSAO_CALCULO);
                    return false;
                }
            } else if (!HelperDate.dateAfterOrEquals(falta.getDataInicioPeriodoFalta(), calculo.getDataInicioCalculo())) {
                validator.getParameters().put("1", DATA_INICIO_CALCULO);
                return false;
            }
        } else if (Utils.naoNulo(calculo.getDataDemissao())) {
            if (!HelperDate.dateBeforeOrEquals(falta.getDataTerminoPeriodoFalta(), calculo.getDataDemissao())) {
                validator.getParameters().put("1", DATA_DEMISSAO_CALCULO);
                return false;
            }
        } else if (!HelperDate.dateBeforeOrEquals(falta.getDataTerminoPeriodoFalta(), calculo.getDataTerminoCalculo())) {
            validator.getParameters().put("1", DATA_TERMINO_CALCULO);
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

