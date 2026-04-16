/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoCobrancaReclamanteEnum {
    DESCONTAR_CREDITO("Descontar dos cr\u00e9ditos do reclamante", "D"),
    COBRAR("Cobrar do reclamante", "C");

    private String nome;
    private String valor;

    private TipoCobrancaReclamanteEnum(String nome, String valor) {
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

