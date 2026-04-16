/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum IndiceDeCorrecaoDoFGTSEnum {
    UTILIZAR_INDICE_TRABALHISTA("Utilizar \u00edndice trabalhista", "UIT"),
    UTILIZAR_INDICE_JAM("Utilizar \u00edndice JAM", "UIJ"),
    UTILIZAR_INDICE_JAM_E_TRABALHISTA("Utilizar \u00edndice JAM e \u00edndice trabalhista", "UJT");

    private String nome;
    private String valor;

    private IndiceDeCorrecaoDoFGTSEnum(String nome, String valor) {
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

