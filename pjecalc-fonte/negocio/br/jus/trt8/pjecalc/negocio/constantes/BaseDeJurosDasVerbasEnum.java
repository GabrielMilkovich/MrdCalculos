/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum BaseDeJurosDasVerbasEnum {
    VERBAS("Verbas", "V"),
    VERBA_INSS("Verba (-) Contribui\u00e7\u00e3o Social", "VI"),
    VERBA_INSS_PP("Verba (-) Contribui\u00e7\u00e3o Social (-) Previd\u00eancia Privada", "VIP");

    private String nome;
    private String valor;

    private BaseDeJurosDasVerbasEnum(String nome, String valor) {
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

