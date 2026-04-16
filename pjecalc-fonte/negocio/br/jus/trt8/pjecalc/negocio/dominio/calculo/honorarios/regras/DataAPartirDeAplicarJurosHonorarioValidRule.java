/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.regras;

import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.util.Date;

public class DataAPartirDeAplicarJurosHonorarioValidRule
implements ValidRule {
    private static final String DATA_ULTIMA_ATUALIZACAO = "dataUltimaAtualizacao";

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Honorario honorario = null;
        ParcelasAtualizaveisHonorario paHonorario = null;
        Date jurosAPartirDe = null;
        if (context.getBean() instanceof Honorario) {
            honorario = (Honorario)context.getBean();
            jurosAPartirDe = honorario.getDataApartirDeAplicarJuros();
        } else if (context.getBean() instanceof ParcelasAtualizaveisHonorario) {
            paHonorario = (ParcelasAtualizaveisHonorario)context.getBean();
            jurosAPartirDe = paHonorario.getDataApartirDeAplicarJurosInformado();
        } else {
            return true;
        }
        Calculo calculo = ServicoDeCalculo.getInstancia().obterCalculoAberto();
        if (calculo.isCalculoExterno().booleanValue()) {
            Date dataUltimaAtualizacao = calculo.getDataAjuizamento();
            if (paHonorario == null || !paHonorario.getAplicarJurosInformado().booleanValue()) {
                return true;
            }
            if (jurosAPartirDe != null && dataUltimaAtualizacao != null && jurosAPartirDe.before(dataUltimaAtualizacao)) {
                validator.getParameters().put("1", DATA_ULTIMA_ATUALIZACAO);
                return false;
            }
        }
        return true;
    }

    @Override
    public Mensagens getMessage() {
        return Mensagens.MSG0008;
    }
}

