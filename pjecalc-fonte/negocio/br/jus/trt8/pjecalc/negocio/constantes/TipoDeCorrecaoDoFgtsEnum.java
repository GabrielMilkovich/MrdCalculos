/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import java.math.BigDecimal;

public enum TipoDeCorrecaoDoFgtsEnum {
    PELA_DATA_DE_DEMISSAO{

        @Override
        public BigDecimal indice(OcorrenciaDeFgts ocorrencia) {
            return ocorrencia.getIndiceAcumuladoDaMulta();
        }
    }
    ,
    PELA_DATA_DE_LIQUIDACAO{

        @Override
        public BigDecimal indice(OcorrenciaDeFgts ocorrencia) {
            return ocorrencia.getIndiceAcumulado();
        }
    };


    public abstract BigDecimal indice(OcorrenciaDeFgts var1);
}

