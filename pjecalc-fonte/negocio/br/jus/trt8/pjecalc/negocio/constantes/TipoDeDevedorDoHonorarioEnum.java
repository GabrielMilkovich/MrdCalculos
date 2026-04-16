/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeDevedorDoHonorarioEnum {
    RECLAMANTE("Reclamante", "RT", "Honor\u00e1rios devidos pelo Reclamante"),
    RECLAMADO("Reclamado", "RD", "Honor\u00e1rios devidos pelo Reclamado");

    private String nome;
    private String valor;
    private String descricao;

    private TipoDeDevedorDoHonorarioEnum(String nome, String valor, String descricao) {
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

