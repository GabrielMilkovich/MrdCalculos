/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeAliquotaDoSeguradoEnum {
    SEGURADO_EMPREGADO("Segurado Empregado", "SE"),
    EMPREGADO_DOMESTICO("Empregado Dom\u00e9stico", "ED"),
    FIXA("Fixa", "F");

    private String nome;
    private String valor;

    private TipoDeAliquotaDoSeguradoEnum(String nome, String valor) {
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

