/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeAliquotaDoEmpregadorEnum {
    POR_ATIVIDADE_ECONOMICA("Por Atividade Econ\u00f4mica", "A"),
    POR_PERIODO("Por Per\u00edodo", "PP"),
    FIXA("Fixa", "F");

    private String nome;
    private String valor;

    private TipoDeAliquotaDoEmpregadorEnum(String nome, String valor) {
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

