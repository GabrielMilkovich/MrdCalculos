/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum SemanaEnum {
    FERIADO("Feriado", 0),
    DOMINGO("Domingo", 1),
    SEGUNDA("Segunda", 2),
    TERCA("Ter\u00e7a", 3),
    QUARTA("Quarta", 4),
    QUINTA("Quinta", 5),
    SEXTA("Sexta", 6),
    SABADO("S\u00e1bado", 7);

    private String nome;
    private Integer sequencial;

    private SemanaEnum(String nome, Integer sequencial) {
        this.nome = nome;
        this.sequencial = sequencial;
    }

    public String getNome() {
        return this.nome;
    }

    public Integer getSequencial() {
        return this.sequencial;
    }

    public static SemanaEnum getFromSequencial(Integer sequencial) {
        for (SemanaEnum e : SemanaEnum.values()) {
            if (!e.getSequencial().equals(sequencial)) continue;
            return e;
        }
        return null;
    }
}

