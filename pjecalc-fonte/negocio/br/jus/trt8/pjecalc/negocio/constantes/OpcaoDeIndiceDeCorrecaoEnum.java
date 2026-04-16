/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum OpcaoDeIndiceDeCorrecaoEnum {
    UTILIZAR_INDICE_TRABALHISTA("Utilizar \u00edndice trabalhista", "UIT"),
    UTILIZAR_OUTRO_INDICE("Utilizar outro \u00edndice", "UOI");

    private String nome;
    private String valor;

    private OpcaoDeIndiceDeCorrecaoEnum(String nome, String valor) {
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

