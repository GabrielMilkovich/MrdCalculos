/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;

public class Total
implements Serializable {
    private static final long serialVersionUID = 3273604888459404540L;
    private boolean arredondar;
    private BigDecimal valor;

    public Total(boolean arredondar) {
        this.arredondar = arredondar;
        this.zerar();
    }

    public Total() {
        this(false);
    }

    public static Total newInstance() {
        return new Total();
    }

    public static Total newInstance(boolean arredondar) {
        return new Total(arredondar);
    }

    private BigDecimal checarArredondamento(BigDecimal valor) {
        return this.arredondar ? Utils.arredondarValorMonetario(valor) : valor;
    }

    public void zerar() {
        this.valor = BigDecimal.ZERO;
    }

    public void acumular(BigDecimal valor) {
        this.valor = Utils.somar(this.valor, this.checarArredondamento(valor), this.valor);
    }

    public void diminuir(BigDecimal valor) {
        this.valor = Utils.subtrair(this.valor, this.checarArredondamento(valor), this.valor);
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public String toString() {
        return this.valor.toString();
    }
}

