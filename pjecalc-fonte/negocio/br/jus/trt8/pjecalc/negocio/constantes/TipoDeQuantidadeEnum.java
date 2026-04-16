/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeQuantidadeEnum {
    INFORMADA("Informada", "IN"),
    IMPORTADA_DO_CALENDARIO("Importada do Calend\u00e1rio", "ICL"),
    IMPORTADA_DO_CARTAO("Importada do Cart\u00e3o de Ponto", "ICP"),
    AVOS("Avos", "AV"),
    APURADA("Apurada", "AP");

    private String nome;
    private String valor;

    private TipoDeQuantidadeEnum(String nome, String valor) {
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

