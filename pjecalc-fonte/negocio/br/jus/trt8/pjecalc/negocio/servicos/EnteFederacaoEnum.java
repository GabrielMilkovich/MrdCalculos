/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.servicos;

public enum EnteFederacaoEnum {
    UNIAO("Uni\u00e3o"),
    ESTADO_MUNICIPIO("Estado e Munic\u00edpio");

    private String descricao;

    private EnteFederacaoEnum(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return this.descricao;
    }
}

