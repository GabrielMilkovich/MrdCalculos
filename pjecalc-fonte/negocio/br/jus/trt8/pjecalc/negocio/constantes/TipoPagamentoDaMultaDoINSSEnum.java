/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoPagamentoDaMultaDoINSSEnum {
    INTEGRAL("Integral", "I"),
    REDUZIDO("Reduzido", "R");

    private String nome;
    private String valor;

    private TipoPagamentoDaMultaDoINSSEnum(String nome, String valor) {
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

