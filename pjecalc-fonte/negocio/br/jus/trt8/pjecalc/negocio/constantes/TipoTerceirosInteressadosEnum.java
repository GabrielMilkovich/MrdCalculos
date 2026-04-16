/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoTerceirosInteressadosEnum {
    ADV("Honor\u00e1rios Advocat\u00edcios"),
    PER("Honor\u00e1rios Periciais"),
    OUT("Outros");

    private String nome;

    private TipoTerceirosInteressadosEnum(String nome) {
        this.nome = nome;
    }

    public String getNome() {
        return this.nome;
    }
}

