/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoFeriadoEnum {
    FERIADO("Feriado", "F"),
    PONTO_FACULTATIVO("Ponto Facultativo", "P"),
    BANCARIO("Feriado Exclusivamente Banc\u00e1rio", "B");

    private String nome;
    private String valor;

    private TipoFeriadoEnum(String nome, String valor) {
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

