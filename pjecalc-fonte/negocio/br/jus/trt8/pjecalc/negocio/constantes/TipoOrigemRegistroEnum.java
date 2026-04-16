/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoOrigemRegistroEnum {
    CALCULO("C\u00e1lculo", "C"),
    ATUALIZACAO("Atualiza\u00e7\u00e3o", "A");

    private String nome;
    private String valor;

    private TipoOrigemRegistroEnum(String nome, String valor) {
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

