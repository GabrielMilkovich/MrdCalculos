/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeApuracaoPrazoDoAvisoPrevioEnum {
    NAO_APURAR("N\u00e3o apurar", "N"),
    APURACAO_CALCULADA("Calculado", "C"),
    APURACAO_INFORMADA("Informado", "I");

    private String nome;
    private String valor;

    private TipoDeApuracaoPrazoDoAvisoPrevioEnum(String nome, String valor) {
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

