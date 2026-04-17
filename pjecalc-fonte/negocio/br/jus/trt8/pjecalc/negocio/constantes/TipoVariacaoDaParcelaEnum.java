/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoVariacaoDaParcelaEnum {
    FIXA("Fixa", "F"),
    VARIAVEL("Vari\u00e1vel", "V");

    private String nome;
    private String valor;

    private TipoVariacaoDaParcelaEnum(String nome, String valor) {
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

