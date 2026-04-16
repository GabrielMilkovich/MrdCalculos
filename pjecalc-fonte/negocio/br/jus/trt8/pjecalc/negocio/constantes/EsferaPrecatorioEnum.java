/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.negocio.constantes.GrupoEsferaPrecatorioEnum;

public enum EsferaPrecatorioEnum {
    F("Esfera Federal"),
    E("Esfera Estadual"),
    M("Esfera Municipal");

    private String nome;

    private EsferaPrecatorioEnum(String nome) {
        this.nome = nome;
    }

    public String getNome() {
        return this.nome;
    }

    public GrupoEsferaPrecatorioEnum getGrupo() {
        switch (this) {
            case F: {
                return GrupoEsferaPrecatorioEnum.FEDERAL;
            }
        }
        return GrupoEsferaPrecatorioEnum.ESTADUAL_MUNICIPAL;
    }
}

