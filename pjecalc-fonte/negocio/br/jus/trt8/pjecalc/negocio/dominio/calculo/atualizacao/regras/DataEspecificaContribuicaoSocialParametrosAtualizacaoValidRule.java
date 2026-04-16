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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import java.util.Date;

public class DataEspecificaContribuicaoSocialParametrosAtualizacaoValidRule
implements ValidRule {
    private static final String DATA_HOJE = "dataHoje";
    private static final String DATA_ADMISSAO = "calculo.dataAdmissao";
    private int flag = 0;

    @Override
    public Mensagens getMessage() {
        if (this.flag == 0) {
            return Mensagens.MSG0008;
        }
        return Mensagens.MSG0010;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        ParametrosDeAtualizacao parametrosDeAtualizacao = (ParametrosDeAtualizacao)context.getBean();
        boolean lei11941 = parametrosDeAtualizacao.getLei11941();
        Date aplicarAte = (Date)context.getValue();
        Date admissao = parametrosDeAtualizacao.getCalculo().getDataAdmissao();
        if (!lei11941 || Utils.nulo(aplicarAte) || Utils.nulo(admissao)) {
            return true;
        }
        if (HelperDate.dateBefore(aplicarAte, admissao)) {
            validator.getParameters().put("1", DATA_ADMISSAO);
            return false;
        }
        HelperDate hoje = HelperDate.getInstance();
        hoje.removeTime();
        if (hoje.lessThen(aplicarAte)) {
            this.flag = 1;
            validator.getParameters().put("1", DATA_HOJE);
            return false;
        }
        return true;
    }
}

