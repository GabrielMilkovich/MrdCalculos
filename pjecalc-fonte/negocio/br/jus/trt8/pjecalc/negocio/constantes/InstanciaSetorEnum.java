/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum InstanciaSetorEnum {
    PRIMEIRA("1\u00aa Inst\u00e2ncia", "1"),
    SEGUNDA("2\u00aa Inst\u00e2ncia", "2");

    private final String nome;
    private final String valor;

    private InstanciaSetorEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static InstanciaSetorEnum getFromValor(Integer valor) {
        for (InstanciaSetorEnum e : InstanciaSetorEnum.values()) {
            if (valor == null || !e.getValor().equalsIgnoreCase(valor.toString())) continue;
            return e;
        }
        return PRIMEIRA;
    }
}

