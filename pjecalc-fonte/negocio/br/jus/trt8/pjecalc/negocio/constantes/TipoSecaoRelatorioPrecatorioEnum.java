/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoSecaoRelatorioPrecatorioEnum {
    EXEQUENTE_LIQUIDO("Exequente L\u00edquido", "EL"),
    OUTROS_DEBITOS("Outros D\u00e9bitos", "OD"),
    TERCEIROS_INTERESSADOS("Terceiros Interessados", "TI"),
    TERCEIROS_INTERESSADOS_SUSPENSO("Terceiros Interessados", "TIS");

    private String nome;
    private String valor;

    private TipoSecaoRelatorioPrecatorioEnum(String nome, String valor) {
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

