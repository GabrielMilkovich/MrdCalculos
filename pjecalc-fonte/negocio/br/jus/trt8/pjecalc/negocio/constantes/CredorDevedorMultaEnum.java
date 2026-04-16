/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum CredorDevedorMultaEnum {
    RECLAMANTE_RECLAMADO("Reclamante e Reclamado", "RTRD", "Multas / Indeniza\u00e7\u00f5es devidas ao Reclamante"),
    RECLAMADO_RECLAMANTE("Reclamado e Reclamante", "RDRT", "Multas / Indeniza\u00e7\u00f5es devidas ao Reclamado"),
    TERCEIRO_RECLAMANTE("Terceiro e Reclamante", "TRT", "Multas / Indeniza\u00e7\u00f5es devidas a Terceiros pelo Reclamante"),
    TERCEIRO_RECLAMADO("Terceiro e Reclamado", "TRD", "Multas / Indeniza\u00e7\u00f5es devidas a Terceiros pelo Reclamado");

    private String nome;
    private String valor;
    private String descricao;

    private CredorDevedorMultaEnum(String nome, String valor, String descricao) {
        this.nome = nome;
        this.valor = valor;
        this.descricao = descricao;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public String getDescricao() {
        return this.descricao;
    }
}

