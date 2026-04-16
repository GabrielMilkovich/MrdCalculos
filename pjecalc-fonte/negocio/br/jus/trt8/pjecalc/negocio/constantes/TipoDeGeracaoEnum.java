/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeGeracaoEnum {
    DEVIDO("Devido", "DV"),
    DIFERENCA("Diferen\u00e7a", "DF");

    private String nome;
    private String valor;

    private TipoDeGeracaoEnum(String nome, String valor) {
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

