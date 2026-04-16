/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoPrecatorioEnum {
    RPV("RPV", "RPV"),
    PRE("Precat\u00f3rio", "PRE");

    private String nome;
    private String valor;

    private TipoPrecatorioEnum(String nome, String valor) {
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

