/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeQuantidadeImportadaDoCalendarioEnum {
    REPOUSOS_FERIADOS("Repousos e Feriados/Pontos Facultativos", "RF"),
    REPOUSOS("Repousos", "R"),
    FERIADOS("Feriados/Pontos Facultativos", "F"),
    DIAS_UTEIS("Dias \u00dateis", "DU");

    private String nome;
    private String valor;

    private TipoDeQuantidadeImportadaDoCalendarioEnum(String nome, String valor) {
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

