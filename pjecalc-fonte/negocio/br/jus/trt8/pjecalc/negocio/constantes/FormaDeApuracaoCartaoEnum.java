/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum FormaDeApuracaoCartaoEnum {
    NAO_APURAR_HORAS_EXTRAS("N\u00e3o apurar horas extras", "NAP"),
    HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_DIARIA("Horas extras excedentes da jornada di\u00e1ria", "HJD"),
    HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL("Horas extras pelo crit\u00e9rio mais favor\u00e1vel", "HMF"),
    HORAS_EXTRAS_CONFORME_SUMULA_85("Horas extras conforme S\u00famula 85 do TST", "HST"),
    APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO("Apurar primeiras horas extras em separado ", "APH"),
    HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_SEMANAL("Horas extras excedentes da jornada semanal", "HJS"),
    HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_MENSAL("Horas extras excedentes da jornada mensal", "HJM");

    private String nome;
    private String valor;

    private FormaDeApuracaoCartaoEnum(String nome, String valor) {
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

