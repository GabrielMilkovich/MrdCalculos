/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum JurosDoAjuizamentoEnum {
    OCORRENCIAS_VENCIDAS_E_VINCENDAS("Ocorr\u00eancias Vencidas e Vincendas", "M"),
    OCORRENCIAS_VENCIDAS("Ocorr\u00eancias Vencidas", "V");

    private String nome;
    private String valor;

    private JurosDoAjuizamentoEnum(String nome, String valor) {
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

