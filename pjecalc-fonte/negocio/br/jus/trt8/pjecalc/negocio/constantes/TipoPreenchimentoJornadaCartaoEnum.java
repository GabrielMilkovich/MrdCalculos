/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoPreenchimentoJornadaCartaoEnum {
    SEMANAL("Semanal", "S"),
    ESCALA("Escala", "E");

    private String nome;
    private String valor;

    private TipoPreenchimentoJornadaCartaoEnum(String nome, String valor) {
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

