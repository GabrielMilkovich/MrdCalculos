/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.Utils;
import java.math.BigDecimal;

public enum AliquotaDoFgtsEnum {
    DOIS_POR_CENTO("2%", "2"){

        @Override
        public BigDecimal calcular(BigDecimal valor) {
            if (Utils.nulo(valor)) {
                return null;
            }
            return valor.multiply(new BigDecimal("0.02"), Utils.CONTEXTO_MATEMATICO);
        }
    }
    ,
    OITO_POR_CENTO("8%", "8"){

        @Override
        public BigDecimal calcular(BigDecimal valor) {
            if (Utils.nulo(valor)) {
                return null;
            }
            return valor.multiply(new BigDecimal("0.08"), Utils.CONTEXTO_MATEMATICO);
        }
    };

    private String nome;
    private String valor;

    private AliquotaDoFgtsEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public abstract BigDecimal calcular(BigDecimal var1);
}

