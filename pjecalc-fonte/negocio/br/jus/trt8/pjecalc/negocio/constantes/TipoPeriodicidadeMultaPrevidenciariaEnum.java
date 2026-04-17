/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoPeriodicidadeMultaPrevidenciariaEnum {
    TAXA_UNICA("Taxa \u00danica", "U"),
    DIARIA("Di\u00e1ria", "D");

    private String nome;
    private String valor;

    private TipoPeriodicidadeMultaPrevidenciariaEnum(String nome, String valor) {
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

