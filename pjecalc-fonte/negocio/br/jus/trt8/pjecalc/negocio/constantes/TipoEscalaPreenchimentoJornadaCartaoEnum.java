/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoEscalaPreenchimentoJornadaCartaoEnum {
    OUTRA("Outra", "O"),
    DOZE_POR_DOZE("12x12", "Z"),
    DOZE_POR_VINTE_QUATRO("12x24", "V"),
    DOZE_POR_TRINTA_E_SEIS("12x36", "D"),
    DOZE_POR_QUARENTA_E_OITO("12x48", "Q"),
    CINCO_POR_UM("5x1", "C"),
    SEIS_POR_UM("6x1", "S"),
    OITO_DOIS("8x2", "T");

    private String nome;
    private String valor;

    private TipoEscalaPreenchimentoJornadaCartaoEnum(String nome, String valor) {
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

