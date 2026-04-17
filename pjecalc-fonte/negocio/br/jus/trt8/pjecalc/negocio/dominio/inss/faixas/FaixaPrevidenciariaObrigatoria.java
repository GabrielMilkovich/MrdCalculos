/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.MappedSuperclass
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.faixas;

import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.FaixaPrevidenciaria;
import java.math.BigDecimal;
import javax.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class FaixaPrevidenciariaObrigatoria
extends FaixaPrevidenciaria {
    private static final long serialVersionUID = -35937909558219661L;

    public FaixaPrevidenciariaObrigatoria() {
    }

    public FaixaPrevidenciariaObrigatoria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        super(valorInicial, valorFinal, aliquota);
    }

    @Override
    public boolean isValorFinalMenorOuIgualQueValorInicial() {
        return this.getValorFinal().compareTo(this.getValorInicial()) < 0;
    }
}

