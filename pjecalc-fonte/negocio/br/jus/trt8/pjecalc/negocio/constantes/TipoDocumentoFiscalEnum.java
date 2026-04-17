/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorCEI;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorCNPJ;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorCPF;
import br.jus.trt8.pjecalc.base.comum.formaters.FormatadorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public enum TipoDocumentoFiscalEnum {
    CPF{

        @Override
        public String getFormatado(String numDocFiscal) {
            try {
                return FormatadorCPF.getInstance().obterComoString(numDocFiscal);
            }
            catch (FormatadorException e) {
                LOGGER.error(e.getMessage(), (Throwable)e);
                return "";
            }
        }
    }
    ,
    CNPJ{

        @Override
        public String getFormatado(String numDocFiscal) {
            try {
                return FormatadorCNPJ.getInstance().obterComoString(numDocFiscal);
            }
            catch (FormatadorException e) {
                LOGGER.error(e.getMessage(), (Throwable)e);
                return "";
            }
        }
    }
    ,
    CEI{

        @Override
        public String getFormatado(String numDocFiscal) {
            try {
                return FormatadorCEI.getInstance().obterComoString(numDocFiscal);
            }
            catch (FormatadorException e) {
                LOGGER.error(e.getMessage(), (Throwable)e);
                return "";
            }
        }
    };

    private static final Logger LOGGER;

    public String getValor() {
        return this.name();
    }

    public abstract String getFormatado(String var1);

    static {
        LOGGER = LoggerFactory.getLogger(TipoDocumentoFiscalEnum.class);
    }
}

