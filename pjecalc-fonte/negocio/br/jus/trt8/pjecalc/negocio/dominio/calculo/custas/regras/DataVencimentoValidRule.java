/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import java.util.Date;

public class DataVencimentoValidRule
implements ValidRule {
    private static final String DATA_HOJE = "dataHoje";
    private static final String DATA_AJUIZAMENTO_CALCULO = "dataAjuizamento";
    public static final int CONHECIMENTO_RECLAMANTE = 1;
    public static final int CONHECIMENTO_RECLAMADO = 2;
    public static final int LIQUIDACAO = 3;
    public static final int CUSTAS_FIXAS = 4;
    public static final int AUTO = 5;
    public static final int INICIO_ARMAZENAMENTO = 6;
    public static final int TERMINO_ARMAZENAMENTO = 7;
    private int flagMsg = 0;

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        Object bean = context.getBean();
        int flagValidacao = validator.getFlag();
        Date vencimento = null;
        Date ajuizamento = null;
        CustasJudiciais custas = null;
        Armazenamento armazenamento = null;
        switch (flagValidacao) {
            case 1: {
                custas = (CustasJudiciais)bean;
                vencimento = custas.getDataVencimentoConhecimentoDoReclamante();
                ajuizamento = custas.getCalculo().getDataAjuizamento();
                break;
            }
            case 2: {
                custas = (CustasJudiciais)bean;
                vencimento = custas.getDataVencimentoConhecimentoDoReclamado();
                ajuizamento = custas.getCalculo().getDataAjuizamento();
                break;
            }
            case 3: {
                custas = (CustasJudiciais)bean;
                vencimento = custas.getDataVencimentoCustasDeLiquidacao();
                ajuizamento = custas.getCalculo().getDataAjuizamento();
                break;
            }
            case 4: {
                custas = (CustasJudiciais)bean;
                vencimento = custas.getDataVencimentoCustasFixas();
                ajuizamento = custas.getCalculo().getDataAjuizamento();
                break;
            }
            case 5: {
                AutoJudicial auto = (AutoJudicial)bean;
                vencimento = auto.getDataVencimentoAuto();
                ajuizamento = auto.getCustasJudiciais().getCalculo().getDataAjuizamento();
                break;
            }
            case 6: {
                armazenamento = (Armazenamento)bean;
                vencimento = armazenamento.getDataInicioArmazenamento();
                ajuizamento = armazenamento.getCustasJudiciais().getCalculo().getDataAjuizamento();
                break;
            }
            case 7: {
                armazenamento = (Armazenamento)bean;
                vencimento = armazenamento.getDataTerminoArmazenamento();
                ajuizamento = armazenamento.getCustasJudiciais().getCalculo().getDataAjuizamento();
                break;
            }
        }
        if (Utils.nulo(vencimento)) {
            return true;
        }
        if (Utils.naoNulo(ajuizamento) && HelperDate.dateBefore(vencimento, ajuizamento)) {
            validator.getParameters().put("1", DATA_AJUIZAMENTO_CALCULO);
            return false;
        }
        HelperDate hoje = HelperDate.getInstance();
        hoje.removeTime();
        if (hoje.lessThen(vencimento)) {
            this.flagMsg = 1;
            validator.getParameters().put("1", DATA_HOJE);
            return false;
        }
        return true;
    }

    @Override
    public Mensagens getMessage() {
        if (this.flagMsg == 0) {
            return Mensagens.MSG0008;
        }
        return Mensagens.MSG0010;
    }
}

