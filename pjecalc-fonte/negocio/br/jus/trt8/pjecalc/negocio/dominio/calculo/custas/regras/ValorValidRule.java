/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.regras;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.ValidatorContext;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidRule;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValueValidator;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import java.math.BigDecimal;
import java.util.Date;

public class ValorValidRule
implements ValidRule {
    public static final int PISO_RECLAMADO = 1;
    public static final int PISO_RECLAMANTE = 2;
    public static final int TETO_LIQUIDACAO = 3;
    private int flagMsg = 0;
    private int flagValidacao = 0;

    @Override
    public boolean isValid(ValidValueValidator validator, ValidatorContext context) {
        CustasJudiciais custasJudiciais = (CustasJudiciais)context.getBean();
        this.flagValidacao = validator.getFlag();
        switch (this.flagValidacao) {
            case 1: {
                if (this.validar(custasJudiciais.getDataVencimentoConhecimentoDoReclamado(), custasJudiciais.getValorConhecimentoDoReclamado())) break;
                return false;
            }
            case 2: {
                if (this.validar(custasJudiciais.getDataVencimentoConhecimentoDoReclamante(), custasJudiciais.getValorDeConhecimentoDoReclamante())) break;
                return false;
            }
            case 3: {
                if (this.validar(custasJudiciais.getDataVencimentoCustasDeLiquidacao(), custasJudiciais.getValorCustasDeLiquidacao())) break;
                return false;
            }
        }
        return true;
    }

    private boolean validar(Date vencimento, BigDecimal valorComparavel) {
        if (Utils.nulo(vencimento)) {
            return true;
        }
        ParametrosDeCustasFixas parametros = ParametrosDeCustasFixas.obterPorData(vencimento);
        if (Utils.nulo(parametros)) {
            return true;
        }
        switch (this.flagValidacao) {
            case 1: 
            case 2: {
                if (valorComparavel.compareTo(parametros.getValorPisoCustasConhecimento()) >= 0) break;
                return false;
            }
            case 3: {
                if (valorComparavel.compareTo(parametros.getValorTetoCustasLiquidacao()) <= 0) break;
                return false;
            }
        }
        return true;
    }

    @Override
    public Mensagens getMessage() {
        if (this.flagMsg == 0) {
            return Mensagens.MSG0052;
        }
        return Mensagens.MSG0054;
    }
}

