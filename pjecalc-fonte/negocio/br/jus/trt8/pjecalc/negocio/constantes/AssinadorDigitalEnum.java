/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum AssinadorDigitalEnum {
    NAO_SUPORTADO("N\u00e3o Suportado", ""),
    APPLET("Applet", "A"),
    SHODO("Shodo", "S"),
    PJEOFFICE("PJeOffice", "P");

    private String nome;
    private String valor;

    private AssinadorDigitalEnum(String nome, String valor) {
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

