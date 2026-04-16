/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum SituacaoDaFeriasEnum {
    GOZADAS("Gozadas", "G"),
    GOZADAS_PARCIALMENTE("Gozadas Parcialmente", "GP"),
    NAO_GOZADAS("N\u00e3o Gozadas", "NG"),
    INDENIZADAS("Indenizadas", "I"),
    PERDIDAS("Perdidas", "P");

    private String nome;
    private String valor;

    private SituacaoDaFeriasEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static SituacaoDaFeriasEnum obterPorValor(String valor) {
        for (SituacaoDaFeriasEnum e : SituacaoDaFeriasEnum.values()) {
            if (!e.valor.equalsIgnoreCase(valor)) continue;
            return e;
        }
        return null;
    }
}

