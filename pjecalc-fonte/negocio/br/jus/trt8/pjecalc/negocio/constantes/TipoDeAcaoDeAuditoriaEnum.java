/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeAcaoDeAuditoriaEnum {
    LIQUIDACAO("Liquida\u00e7\u00e3o de C\u00e1lculo", "L"),
    LIQUIDACAO_ATUALIZACAO("Liquida\u00e7\u00e3o da Atualiza\u00e7\u00e3o", "LA"),
    ALTERACAO_PENSAO_ALIMENTICIA("Altera\u00e7\u00e3o na Pens\u00e3o Aliment\u00edcia", "PA"),
    ALTERACAO_FALTAS("Altera\u00e7\u00e3o em Faltas", "F");

    private String nome;
    private String valor;

    private TipoDeAcaoDeAuditoriaEnum(String nome, String valor) {
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

