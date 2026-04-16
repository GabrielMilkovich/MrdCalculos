/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeQuantidadeImportadaDoCartaoDePontoEnum {
    HORAS_EXTRAS_DIURNAS("Horas Extras Diurnas", "HED"),
    HORAS_EXTRAS_NOTURNAS("Horas Extras Noturnas", "HEN"),
    HORAS_EXTRAS_DIURNAS_E_NOTURNAS("Horas Extras Diurnas e Noturnas", "HEDN"),
    HORAS_NOTURNAS("Horas Noturnas", "HN"),
    REPOUSOS("Repousos", "R"),
    FERIADOS("Feriados/Pontos Facultativos", "F"),
    REPOUSOS_FERIADOS("Repousos e Feriados/Pontos Facultativos", "RF"),
    INTRAJORNADA("Intrajornada", "ITRA"),
    INTERJORNADA("Interjornada", "ITER");

    private String nome;
    private String valor;

    private TipoDeQuantidadeImportadaDoCartaoDePontoEnum(String nome, String valor) {
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

