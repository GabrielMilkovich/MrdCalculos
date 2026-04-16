/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeAutoEnum {
    REMICAO("Remi\u00e7\u00e3o", "R"),
    ADJUDICACAO("Adjudica\u00e7\u00e3o", "AD"),
    ARREMATACAO("Arremata\u00e7\u00e3o", "AR");

    private String nome;
    private String valor;

    private TipoDeAutoEnum(String nome, String valor) {
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

