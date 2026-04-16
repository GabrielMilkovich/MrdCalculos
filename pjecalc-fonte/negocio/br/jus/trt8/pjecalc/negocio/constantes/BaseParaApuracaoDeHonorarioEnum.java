/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import java.util.Arrays;
import java.util.List;

public enum BaseParaApuracaoDeHonorarioEnum {
    BRUTO("Bruto", "B"),
    BRUTO_MENOS_CONTRIBUICAO_SOCIAL("Bruto (-) Contribui\u00e7\u00e3o Social", "BC"),
    BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA("Bruto (-) Contribui\u00e7\u00e3o Social (-) Previd\u00eancia Privada", "BCP"),
    VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL("Verbas que n\u00e3o comp\u00f5em o Principal", "VNP");

    private String nome;
    private String valor;

    private BaseParaApuracaoDeHonorarioEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static List<BaseParaApuracaoDeHonorarioEnum> getBasesReclamante() {
        return Arrays.asList(BaseParaApuracaoDeHonorarioEnum.values());
    }

    public static List<BaseParaApuracaoDeHonorarioEnum> getBasesReclamado() {
        return Arrays.asList(BRUTO, BRUTO_MENOS_CONTRIBUICAO_SOCIAL, BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA);
    }
}

