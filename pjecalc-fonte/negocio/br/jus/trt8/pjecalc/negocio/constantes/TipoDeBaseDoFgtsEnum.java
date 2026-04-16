/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeBaseDoFgtsEnum {
    CALCULADA("Calculado", "C"),
    INFORMADA("Informado", "I");

    private String nome;
    private String valor;

    private TipoDeBaseDoFgtsEnum(String nome, String valor) {
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

