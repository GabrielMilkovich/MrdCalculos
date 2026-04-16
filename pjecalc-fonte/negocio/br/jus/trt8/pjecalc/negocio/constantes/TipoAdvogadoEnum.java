/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoAdvogadoEnum {
    RECLAMANTE("Reclamante", "RT"),
    RECLAMADO("Reclamado", "RD");

    private String nome;
    private String valor;

    private TipoAdvogadoEnum(String nome, String valor) {
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

