/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeOperacaoDoFgtsEnum {
    DEPOSITO("Dep\u00f3sito", "D"),
    SAQUE("Saque", "S");

    private String nome;
    private String valor;

    private TipoDeOperacaoDoFgtsEnum(String nome, String valor) {
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

