/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoOcorrenciaIrpfEnum {
    NORMAL("Normal", "N"),
    TRIBUTACAO_EM_SEPARADO("Tributa\u00e7\u00e3o em Separado", "S"),
    TRIBUTACAO_EXCLUSIVA("Tributa\u00e7\u00e3o Exclusiva", "E"),
    RRA_ANOS_ANTERIORES("RRA de Anos Anteriores", "A");

    private String nome;
    private String valor;

    private TipoOcorrenciaIrpfEnum(String nome, String valor) {
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

