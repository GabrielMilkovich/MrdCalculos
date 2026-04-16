/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum OcorrenciaDePagamentoEnum {
    DESLIGAMENTO("Desligamento", "DL"),
    DEZEMBRO("Dezembro", "DZ"),
    MENSAL("Mensal", "M"),
    PERIODO_AQUISITIVO("Per\u00edodo Aquisitivo", "PA");

    private String nome;
    private String valor;

    private OcorrenciaDePagamentoEnum(String nome, String valor) {
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

