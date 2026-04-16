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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import java.util.Date;

public class DataGeralParametrosAtualizacaoValidRule
implements ValidRule {
    private static final String DATA_HOJE = "dataHoje";
    private static final String DATA_ADMISSAO = "calculo.dataAdmissao";
    private static final String DATA_ULTIMA_ATUALIZACAO = "calculoExterno.dataUltimaAtualizacao";
    private static final String DATA_AJUIZAMENTO = "calculo.dataAjuizamento";
    private int flag = 0;

    @Override
    public Mensagens getMessage() {
        if (this.flag == 0) {
            return Mensagens.MSG0007;
        }
        return Mensagens.MSG0010;
    }

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Date admissao;
        ParametrosDeAtualizacao parametrosDeAtualizacao = null;
        boolean isCombinacaoJuros = false;
        if (context.getBean() instanceof ParametrosDeAtualizacao) {
            parametrosDeAtualizacao = (ParametrosDeAtualizacao)context.getBean();
        } else if (context.getBean() instanceof CombinacaoDeIndice) {
            parametrosDeAtualizacao = ((CombinacaoDeIndice)context.getBean()).getParametrosDeAtualizacao();
        } else if (context.getBean() instanceof CombinacaoDeJuros) {
            parametrosDeAtualizacao = ((CombinacaoDeJuros)context.getBean()).getParametrosDeAtualizacao();
            isCombinacaoJuros = true;
        } else {
            return true;
        }
        boolean isCalculoExterno = parametrosDeAtualizacao.getCalculo().isCalculoExterno();
        Date aPartirDe = (Date)context.getValue();
        if (isCombinacaoJuros) {
            Date dataLimite;
            Date date = isCalculoExterno ? parametrosDeAtualizacao.getCalculo().getDataDeLiquidacao() : (dataLimite = parametrosDeAtualizacao.getAplicarJurosFasePreJudicial() != false ? parametrosDeAtualizacao.getCalculo().getDataAdmissao() : parametrosDeAtualizacao.getCalculo().getDataAjuizamento());
            if (Utils.nulo(aPartirDe) || Utils.nulo(dataLimite) || HelperDate.dateAfter(aPartirDe, dataLimite)) {
                return true;
            }
            validator.getParameters().put("1", isCalculoExterno ? DATA_ULTIMA_ATUALIZACAO : (parametrosDeAtualizacao.getAplicarJurosFasePreJudicial() != false ? DATA_ADMISSAO : DATA_AJUIZAMENTO));
            return false;
        }
        Date date = admissao = isCalculoExterno ? parametrosDeAtualizacao.getCalculo().getDataDeLiquidacao() : parametrosDeAtualizacao.getCalculo().getDataAdmissao();
        if (Utils.naoNulo(aPartirDe) && Utils.naoNulo(admissao)) {
            HelperDate hoje = HelperDate.getInstance();
            hoje.removeTime();
            if (HelperDate.dateBeforeOrEquals(aPartirDe, admissao)) {
                validator.getParameters().put("1", isCalculoExterno ? DATA_ULTIMA_ATUALIZACAO : DATA_ADMISSAO);
                return false;
            }
            if (hoje.lessThen(aPartirDe)) {
                this.flag = 1;
                validator.getParameters().put("1", DATA_HOJE);
                return false;
            }
        }
        return true;
    }
}

