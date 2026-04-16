/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum PeriodoDaMediaDoReflexoEnum {
    PERIODO_AQUISITIVO("Per\u00edodo Aquisitivo", "PA"),
    ANO_CIVIL("Ano Civil", "AC"),
    ULTIMOS_DOZE_MESES_DO_CONTRATO("\u00daltimos Doze Meses do Contrato", "DM"),
    DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA("Doze Meses Anteriores ao Vencimento da Verba", "DA");

    private String nome;
    private String valor;

    private PeriodoDaMediaDoReflexoEnum(String nome, String valor) {
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

