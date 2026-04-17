/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum BaseParaCustasCalculadasEnum {
    BRUTO_DEVIDO_AO_RECLAMANTE("Bruto Devido ao Reclamante", "BR"),
    BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO("Bruto Devido ao Reclamante + Outros D\u00e9bitos do Reclamado", "BROR");

    private String nome;
    private String valor;

    private BaseParaCustasCalculadasEnum(String nome, String valor) {
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

