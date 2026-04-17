/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum CartoesDePontoEnum {
    HORAS_EXTRAS_MENSAIS("Hs Ext Mensais", "HEM", 0),
    HORAS_EXTRAS_DIARIAS("Hs Ext Di\u00e1rias", "HED", 0),
    HORAS_EXTRAS_SEMANAIS("Hs Ext Semanais", "HES", 0),
    HORAS_DIURNAS("Hs Diurnas", "HRD", 0),
    DIFERENCA_HORAS_NOTURNAS("Hs Noturnas (-) Hs Ext Noturnas", "DHN", 0),
    HORAS_TRABALHADAS("Hs Trabalhadas", "HRT", 10),
    HORAS_NOTURNAS("Hs Noturnas", "HRN", 20),
    HORAS_EXTRAS("Hs EXT", "HRE", 30),
    HORAS_EXTRAS_NOTURNAS("Hs Ext Noturnas", "HEN", 40),
    ADICIONAL_SUMULA_85("Adicional S\u00famula 85", "ASO", 50),
    HORAS_EXTRAS_PRIMEIRAS_EM_SEPARADO("Primeiras Hs Ext em Separado", "EPS", 60),
    HORAS_EXTRAS_REPOUSOS("Hs Ext Di\u00e1rias em Repousos", "HED", 65),
    HORAS_EXTRAS_NOTURNAS_REPOUSOS("Hs Ext Noturnas em Repousos", "HEDN", 66),
    HORAS_EXTRAS_FERIADOS("Hs Ext Di\u00e1rias em Feriados", "HEF", 70),
    HORAS_EXTRAS_NOTURNAS_FERIADOS("Hs Ext Noturnas em Feriados", "HEFN", 71),
    HORAS_EXTRAS_REPOUSOS_FERIADOS("Hs Ext em Repousos e Feriados", "HDF", 75),
    HORAS_INTRAJORNADAS("Hs Intrajornada", "HIA", 80),
    HORAS_EXCESSO_INTRAJORNADA("Exc Int Intrajornada", "HEI", 85),
    HORAS_INTERJORNADAS("Hs Interjornadas", "HIE", 90),
    HORAS_ARTIGO_253("Hs Insalubres", "HAD", 100),
    HORAS_ARTIGO_72("Hs Art 72", "HAS", 110),
    HORAS_ARTIGO_384("Hs Art 384", "HAT", 120),
    REPOUSOS_TRABALHADOS("Repousos Trabalhados", "DOT", 125),
    FERIADOS_TRABALHADOS("Feriados Trabalhados", "FET", 130),
    FERIADOS_REPOUSOS_TRABALHADOS("Feriados e Repousos Trabalhados", "DFT", 140),
    DIAS_TRABALHADOS("Dias Trabalhados", "DIT", 150);

    private String nome;
    private String valor;
    private Integer prioridade;

    private CartoesDePontoEnum(String nome, String valor, Integer prioridade) {
        this.nome = nome;
        this.valor = valor;
        this.prioridade = prioridade;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public Integer getPrioridade() {
        return this.prioridade;
    }

    public static CartoesDePontoEnum getFromString(String text) {
        for (CartoesDePontoEnum b : CartoesDePontoEnum.values()) {
            if (!b.nome.equalsIgnoreCase(text)) continue;
            return b;
        }
        return null;
    }

    public static Integer checarOrdemMensal(CartoesDePontoEnum cartaoEnumValor) {
        if (cartaoEnumValor == null) {
            return -1;
        }
        return cartaoEnumValor.getPrioridade();
    }
}

