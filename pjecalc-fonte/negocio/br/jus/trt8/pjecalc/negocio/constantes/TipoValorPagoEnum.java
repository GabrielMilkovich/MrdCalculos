/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoValorPagoEnum {
    INFORMADO("Informado", "I"),
    CALCULADO("Calculado", "C");

    private String nome;
    private String valor;

    private TipoValorPagoEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }
}

