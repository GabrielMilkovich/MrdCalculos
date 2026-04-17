/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeCustasDeConhecimentoEnum {
    NAO_SE_APLICA("N\u00e3o se Aplica", "N"),
    CALCULADA_2_POR_CENTO("Calculada 2%", "C"),
    INFORMADA("Informada", "I");

    private String nome;
    private String valor;

    private TipoDeCustasDeConhecimentoEnum(String nome, String valor) {
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

