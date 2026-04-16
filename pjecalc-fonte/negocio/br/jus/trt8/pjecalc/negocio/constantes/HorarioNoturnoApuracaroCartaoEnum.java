/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum HorarioNoturnoApuracaroCartaoEnum {
    ATIVIDADE_AGRICOLA("Atividade agr\u00edcola 21:00 \u00e0s 05:00", "AAG"),
    ATIVIDADE_PECUARIA("Atividade pecu\u00e1ria 20:00 \u00e0s 04:00", "APE"),
    ATIVIDADE_URBANA("Atividade urbana 22:00 \u00e0s 05:00", "AUR");

    private String nome;
    private String valor;

    private HorarioNoturnoApuracaroCartaoEnum(String nome, String valor) {
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

