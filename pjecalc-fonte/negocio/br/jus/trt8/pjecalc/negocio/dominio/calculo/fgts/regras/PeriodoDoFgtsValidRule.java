/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import java.util.Date;

public class PeriodoDoFgtsValidRule
implements ValidRule {
    public static final int FLAG_DATA_INICIAL = 0;
    public static final int FLAG_DATA_FINAL = 1;

    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0004;
    }

    public Periodo getPeriodoSugerido(Fgts fgts) {
        Periodo periodo = new Periodo();
        HelperDate dataAdmissao = HelperDate.getInstance(fgts.getCalculo().getDataAdmissao());
        HelperDate dataPrescricaoFgts = HelperDate.getInstance(fgts.getCalculo().getDataPrescricaoFgts());
        HelperDate maiorData = dataAdmissao;
        if (fgts.getCalculo().getPrescricaoFgts().booleanValue() && Utils.naoNulo(dataPrescricaoFgts) && (Utils.nulo(maiorData) || dataPrescricaoFgts.greaterThen(maiorData))) {
            maiorData = dataPrescricaoFgts;
        }
        periodo.setInicial(Utils.naoNulo(maiorData) ? maiorData.getDate() : null);
        HelperDate dataDemissao = HelperDate.getInstance(fgts.getCalculo().getDataDemissao());
        HelperDate dataFimDoCalculo = HelperDate.getInstance(fgts.getCalculo().getDataTerminoCalculo());
        maiorData = dataDemissao;
        periodo.setFinal(Utils.naoNulo(maiorData) ? maiorData.getDate() : dataFimDoCalculo.getDate());
        return periodo;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Object value = context.getValue();
        if (Utils.nulo(value)) {
            return true;
        }
        Fgts fgts = (Fgts)context.getBean();
        Periodo periodoSugerido = this.getPeriodoSugerido(fgts);
        Date dataLimiteFim = periodoSugerido.getFinal();
        if (validator.getFlag() == 1) {
            if (HelperDate.getInstance((Date)value).lessThen(fgts.getPeriodoInicial())) {
                return true;
            }
            if (Utils.naoNulo(fgts.getCalculo().getDataDemissao())) {
                dataLimiteFim = fgts.getCalculo().getDataDemissao();
            }
        } else {
            if (HelperDate.getInstance((Date)value).greaterThen(fgts.getPeriodoFinal())) {
                return true;
            }
            dataLimiteFim = Utils.nulo(fgts.getCalculo().getDataDemissao()) ? fgts.getPeriodoFinal() : fgts.getCalculo().getDataDemissao();
        }
        Date dataLimiteInicio = periodoSugerido.getInicial();
        if (Utils.naoNulo(fgts.getCalculo().getDataAdmissao())) {
            HelperDate dataPrescricaoFgts;
            dataLimiteInicio = fgts.getCalculo().getDataAdmissao();
            if (fgts.getCalculo().getPrescricaoFgts().booleanValue() && Utils.naoNulo(dataPrescricaoFgts = HelperDate.getInstance(fgts.getCalculo().getDataPrescricaoFgts())) && (Utils.nulo(dataLimiteInicio) || dataPrescricaoFgts.greaterThen(dataLimiteInicio))) {
                dataLimiteInicio = dataPrescricaoFgts.getDate();
            }
        }
        return HelperDate.getInstance((Date)value).between(dataLimiteInicio, dataLimiteFim);
    }
}

