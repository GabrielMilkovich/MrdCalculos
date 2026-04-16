/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.Utils;
import java.math.BigDecimal;

public enum ValorDaMultaDoFgtsEnum {
    VINTE_POR_CENTO("20%", "20"){

        @Override
        public BigDecimal calcular(BigDecimal valor) {
            if (Utils.nulo(valor)) {
                return null;
            }
            return Utils.arredondarValorMonetario(valor.multiply(new BigDecimal("0.20"), Utils.CONTEXTO_MATEMATICO));
        }
    }
    ,
    QUARENTA_POR_CENTO("40%", "40"){

        @Override
        public BigDecimal calcular(BigDecimal valor) {
            if (Utils.nulo(valor)) {
                return null;
            }
            return Utils.arredondarValorMonetario(valor.multiply(new BigDecimal("0.40"), Utils.CONTEXTO_MATEMATICO));
        }
    };

    private String nome;
    private String valor;

    private ValorDaMultaDoFgtsEnum(String nome, String valor) {
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

