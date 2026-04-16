/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum PreenchimentoJornadasCartaoEnum {
    LIVRE("Livre", "LIV"),
    PROGRAMACAO("Programa\u00e7\u00e3o Semanal", "PRO"),
    ESCALA("Escala", "ESC");

    private String nome;
    private String valor;

    private PreenchimentoJornadasCartaoEnum(String nome, String valor) {
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

