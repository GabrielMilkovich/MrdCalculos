/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoVinculoDeVerbaEnum {
    BASE("Base", "B"),
    VALOR_PAGO("Valor Pago", "P");

    private String nome;
    private String valor;

    private TipoVinculoDeVerbaEnum(String nome, String valor) {
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

