/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.api.AgregadoAoCalculo;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.util.Date;

public class PeriodoDoCalculoValidRule
implements ValidRule {
    public static final int FLAG_DATA_INICIAL = 0;
    public static final int FLAG_DATA_FINAL = 1;

    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0004;
    }

    private Date definirDataAdmissaoOUInicioDoCalculo(Calculo calculo) {
        if (Utils.naoNulo(calculo.getDataAdmissao()) && Utils.nulo(calculo.getDataInicioCalculo())) {
            return calculo.getDataAdmissao();
        }
        if (Utils.naoNulo(calculo.getDataInicioCalculo())) {
            return calculo.getDataInicioCalculo();
        }
        return null;
    }

    private Date sugerirDataInicio(Calculo calculo) {
        if (calculo.getPrescricaoQuinquenal().booleanValue()) {
            if (Utils.naoNulo(calculo.getDataAjuizamento())) {
                HelperDate dataPescricao = HelperDate.getInstance(calculo.getDataAjuizamento()).addYear(-5);
                Date dataInicial = this.definirDataAdmissaoOUInicioDoCalculo(calculo);
                if (Utils.nulo(dataInicial) || dataPescricao.greaterThen(dataInicial)) {
                    return dataPescricao.getDate();
                }
                return dataInicial;
            }
        } else {
            return this.definirDataAdmissaoOUInicioDoCalculo(calculo);
        }
        return null;
    }

    private Date sugerirDataFim(Calculo calculo) {
        if (Utils.naoNulo(calculo.getDataDemissao()) && Utils.naoNulo(calculo.getDataTerminoCalculo())) {
            if (HelperDate.getInstance(calculo.getDataDemissao()).greaterThenOrEquals(calculo.getDataTerminoCalculo())) {
                return calculo.getDataDemissao();
            }
            return calculo.getDataTerminoCalculo();
        }
        if (Utils.naoNulo(calculo.getDataDemissao())) {
            return calculo.getDataDemissao();
        }
        if (Utils.naoNulo(calculo.getDataTerminoCalculo())) {
            return calculo.getDataTerminoCalculo();
        }
        return null;
    }

    public Periodo getPeriodoSugerido(AgregadoAoCalculo agregadoAoCalculo) {
        Calculo calculo = agregadoAoCalculo.getCalculo();
        return new Periodo(this.sugerirDataInicio(calculo), this.sugerirDataFim(calculo));
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Object value = context.getValue();
        if (Utils.nulo(value)) {
            return true;
        }
        AgregadoAoCalculo agregadoAoCalculo = (AgregadoAoCalculo)context.getBean();
        Periodo periodoSugerido = this.getPeriodoSugerido(agregadoAoCalculo);
        if (!periodoSugerido.isCompleto()) {
            return true;
        }
        return validator.getFlag() == 1 ? HelperDate.getInstance((Date)value).lessThanOrEqualsTo(periodoSugerido.getFinal()) : HelperDate.getInstance((Date)value).greaterThenOrEquals(periodoSugerido.getInicial());
    }
}

