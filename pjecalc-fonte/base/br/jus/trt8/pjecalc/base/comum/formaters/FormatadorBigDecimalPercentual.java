/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorBigDecimal;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import java.math.BigDecimal;

public class FormatadorBigDecimalPercentual
extends FormatadorBigDecimal {
    private static final long serialVersionUID = 7934766301992952041L;

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        BigDecimal retorno = (BigDecimal)super.obterComoObjeto(valor);
        retorno = retorno == null ? null : retorno.divide(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
        return retorno;
    }

    @Override
    public String obterComoString(Object valor) throws FormatadorException {
        if (valor == null) {
            return "";
        }
        if (valor instanceof String) {
            if (((String)valor).equals("")) {
                return "";
            }
            BigDecimal retorno = this.normalizarValor((String)valor);
            retorno = retorno.multiply(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
            return this.nf.format(retorno);
        }
        BigDecimal retorno = (BigDecimal)valor;
        retorno = retorno.multiply(Utils.CEM, Utils.CONTEXTO_MATEMATICO);
        return this.nf.format(retorno.setScale(2, 6));
    }
}

