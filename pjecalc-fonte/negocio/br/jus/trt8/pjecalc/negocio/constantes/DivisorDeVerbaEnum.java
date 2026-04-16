/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum DivisorDeVerbaEnum {
    CARGA_HORARIA("Carga Hor\u00e1ria", "CH"),
    DIAS_UTEIS("Dias \u00dateis", "DU"),
    OUTRO_VALOR("Informado *", "OV"),
    IMPORTADA_DO_CARTAO("Importada do Cart\u00e3o de Ponto", "CP");

    private String nome;
    private String valor;

    private DivisorDeVerbaEnum(String nome, String valor) {
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

