/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum FormaAplicacaoEnum {
    MES_A_MES("M\u00eas-a-m\u00eas", "MM"),
    A_PARTIR_DE("A partir de", "PD");

    private String nome;
    private String valor;

    private FormaAplicacaoEnum(String nome, String valor) {
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

