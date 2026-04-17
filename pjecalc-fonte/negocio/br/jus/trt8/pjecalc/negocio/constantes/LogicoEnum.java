/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum LogicoEnum {
    SIM("Sim", "S"),
    NAO("N\u00e3o", "N");

    private String nome;
    private String valor;

    private LogicoEnum(String nome, String valor) {
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

