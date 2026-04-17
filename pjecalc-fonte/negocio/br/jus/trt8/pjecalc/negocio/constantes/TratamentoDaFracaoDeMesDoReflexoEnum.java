/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TratamentoDaFracaoDeMesDoReflexoEnum {
    MANTER("Manter", "M"),
    INTEGRALIZAR("Integralizar", "I"),
    DESPREZAR("Desprezar", "D"),
    DESPREZAR_MENOR_QUE_15_DIAS("Desprezar Menor que 15 Dias", "DMQ");

    private String nome;
    private String valor;

    private TratamentoDaFracaoDeMesDoReflexoEnum(String nome, String valor) {
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

