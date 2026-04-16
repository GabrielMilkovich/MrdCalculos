/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeQuantidadeDeJurosBaseEnum {
    INTEIRO("Inteiro", "I"),
    FRACAO("Fra\u00e7\u00e3o", "F");

    private String nome;
    private String valor;

    private TipoDeQuantidadeDeJurosBaseEnum(String nome, String valor) {
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

