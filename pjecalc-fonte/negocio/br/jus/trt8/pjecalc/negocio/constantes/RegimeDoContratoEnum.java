/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum RegimeDoContratoEnum {
    INTERMITENTE("Trabalho Intermitente", "T"),
    INTEGRAL("Tempo Integral", "I"),
    PARCIAL("Tempo Parcial", "P");

    private String nome;
    private String valor;

    private RegimeDoContratoEnum(String nome, String valor) {
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

