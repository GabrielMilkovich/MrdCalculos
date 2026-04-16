/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum GrupoEsferaPrecatorioEnum {
    FEDERAL("Federal", "F"),
    ESTADUAL_MUNICIPAL("Estadual e Municipal", "E");

    private String nome;
    private String valor;

    private GrupoEsferaPrecatorioEnum(String nome, String valor) {
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

