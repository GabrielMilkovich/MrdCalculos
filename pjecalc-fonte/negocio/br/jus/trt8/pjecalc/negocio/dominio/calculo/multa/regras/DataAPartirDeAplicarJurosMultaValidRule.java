/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.regras;

import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.util.Date;

public class DataAPartirDeAplicarJurosMultaValidRule
implements ValidRule {
    private static final String DATA_ULTIMA_ATUALIZACAO = "dataUltimaAtualizacao";

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Multa multa = null;
        ParcelasAtualizaveisMultaIndenizacao paMulta = null;
        Date jurosAPartirDe = null;
        if (context.getBean() instanceof Multa) {
            multa = (Multa)context.getBean();
            jurosAPartirDe = multa.getDataApartirDeAplicarJuros();
        } else if (context.getBean() instanceof ParcelasAtualizaveisMultaIndenizacao) {
            paMulta = (ParcelasAtualizaveisMultaIndenizacao)context.getBean();
            jurosAPartirDe = paMulta.getDataApartirDeAplicarJurosInformado();
        } else {
            return true;
        }
        Calculo calculo = ServicoDeCalculo.getInstancia().obterCalculoAberto();
        if (calculo.isCalculoExterno().booleanValue()) {
            Date dataUltimaAtualizacao = calculo.getDataAjuizamento();
            if (paMulta == null || !paMulta.getAplicarJurosInformado().booleanValue()) {
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

