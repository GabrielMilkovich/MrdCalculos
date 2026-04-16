/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDaMultaDoINSSEnum {
    URBANA("Urbana", "U"),
    RURAL("Rural", "R");

    private String nome;
    private String valor;

    private TipoDaMultaDoINSSEnum(String nome, String valor) {
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

