/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoSolicitacaoSeguroDesempregoEnum {
    PRIMEIRA("Primeira Solicita\u00e7\u00e3o", "P"),
    SEGUNDA("Segunda Solicita\u00e7\u00e3o", "S"),
    DEMAIS("Demais Solicita\u00e7\u00f5es", "D");

    private String nome;
    private String valor;

    private TipoSolicitacaoSeguroDesempregoEnum(String nome, String valor) {
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

