/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum BaseParaApuracaoDeMultaEnum {
    PRINCIPAL("Principal", "P"),
    PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL("Principal (-) Contribui\u00e7\u00e3o Social", "PC"),
    PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA("Principal (-) Contribui\u00e7\u00e3o Social (-) Previd\u00eancia Privada", "PCP"),
    VALOR_CAUSA("Valor Corrigido da Causa", "VC");

    private String nome;
    private String valor;

    private BaseParaApuracaoDeMultaEnum(String nome, String valor) {
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

