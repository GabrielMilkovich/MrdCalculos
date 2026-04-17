/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeImpostoDeRendaEnum {
    PESSOA_FISICA("IRPF", "PF"),
    PESSOA_JURIDICA("IRPJ", "PJ");

    private String nome;
    private String valor;

    private TipoDeImpostoDeRendaEnum(String nome, String valor) {
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

