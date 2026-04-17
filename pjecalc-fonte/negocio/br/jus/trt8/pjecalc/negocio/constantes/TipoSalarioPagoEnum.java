/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoSalarioPagoEnum {
    NENHUM("Nenhum", "N"),
    ULTIMA_REMUNERACAO("\u00daltima Remunera\u00e7\u00e3o", "U"),
    MAIOR_REMUNERACAO("Maior Remunera\u00e7\u00e3o", "M"),
    HISTORICO_SALARIAL("Hist\u00f3rico Salarial ", "H");

    private String nome;
    private String valor;

    private TipoSalarioPagoEnum(String nome, String valor) {
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

