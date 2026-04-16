/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.base.comum.formaters;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import br.jus.trt8.pjecalc.base.comum.formaters.IFormatador;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FormatadorBigDecimalEspecial
implements IFormatador {
    private static final long serialVersionUID = 717631386741026941L;
    private final Logger logger = LoggerFactory.getLogger(FormatadorBigDecimalEspecial.class);
    private int numeroMaximoDeCasasDecimais = 4;
    private boolean numeroDeCasasVariavel = false;

    public FormatadorBigDecimalEspecial() {
    }

    public FormatadorBigDecimalEspecial(int numeroMaximoDeCasasDecimais) {
        this.numeroMaximoDeCasasDecimais = numeroMaximoDeCasasDecimais;
    }

    public FormatadorBigDecimalEspecial(int numeroMaximoDeCasasDecimais, boolean numeroDeCasasVariavel) {
        this.numeroMaximoDeCasasDecimais = numeroMaximoDeCasasDecimais;
        this.numeroDeCasasVariavel = numeroDeCasasVariavel;
    }

    @Override
    public Object obterComoObjeto(String valor) throws FormatadorException {
        try {
            if (valor == null || valor.trim().isEmpty()) {
                return null;
            }
            valor = valor.replace(".", "");
            valor = valor.replace(",", ".");
            return new BigDecimal(valor);
        }
        catch (Exception e) {
            this.logger.error(e.getMessage(), (Throwable)e);
            throw new FormatadorException("Erro na convers\u00e3o do valor '" + valor + "'");
        }
    }

    @Override
    public String obterComoString(Object objeto) throws FormatadorException {
        if (objeto == null) {
            return "";
        }
        BigDecimal valor = (BigDecimal)objeto;
        if (this.numeroDeCasasVariavel) {
            int numeroCasasDecimais = valor.scale() > this.numeroMaximoDeCasasDecimais ? this.numeroMaximoDeCasasDecimais : valor.scale();
            return Utils.formatarNumero(valor, numeroCasasDecimais);
        }
        return Utils.formatarNumero(valor, this.numeroMaximoDeCasasDecimais);
    }
}

