/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ExcecaoDeJurosDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import java.util.Date;

public class DataEspecificaJurosMoraParametrosAtualizacaoValidRule
implements ValidRule {
    private static final String DATA_HOJE = "dataHoje";
    private static final String DATA_AJUIZAMENTO = "calculo.dataAjuizamento";
    private int flag = 0;

    @Override
    public Mensagens getMessage() {
        if (this.flag == 0) {
            return Mensagens.MSG0007;
        }
        if (this.flag == 1) {
            return Mensagens.MSG0010;
        }
        return Mensagens.MSG0008;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        ParametrosDeAtualizacao parametrosDeAtualizacao;
        boolean ehDaExcecaoJuros = false;
        if (context.getBean() instanceof ParametrosDeAtualizacao) {
            parametrosDeAtualizacao = (ParametrosDeAtualizacao)context.getBean();
        } else {
            parametrosDeAtualizacao = ((ExcecaoDeJurosDaAtualizacao)context.getBean()).getParametrosDeAtualizacao();
            ehDaExcecaoJuros = true;
        }
        if (Utils.nulo(parametrosDeAtualizacao.getCalculo())) {
            return true;
        }
        Date apartirDe = (Date)context.getValue();
        Date ajuizamento = parametrosDeAtualizacao.getCalculo().getDataAjuizamento();
        if (Utils.nulo(apartirDe) || Utils.nulo(ajuizamento)) {
            return true;
        }
        if (ehDaExcecaoJuros) {
            if (HelperDate.dateBefore(apartirDe, ajuizamento)) {
                this.flag = 2;
                validator.getParameters().put("1", DATA_AJUIZAMENTO);
                return false;
            }
        } else if (HelperDate.dateBeforeOrEquals(apartirDe, ajuizamento)) {
            validator.getParameters().put("1", DATA_AJUIZAMENTO);
            return false;
        }
        if (!ehDaExcecaoJuros) {
            HelperDate hoje = HelperDate.getInstance();
            hoje.removeTime();
            if (hoje.lessThen(apartirDe)) {
                this.flag = 1;
                validator.getParameters().put("1", DATA_HOJE);
                return false;
            }
        }
        return true;
    }
}

