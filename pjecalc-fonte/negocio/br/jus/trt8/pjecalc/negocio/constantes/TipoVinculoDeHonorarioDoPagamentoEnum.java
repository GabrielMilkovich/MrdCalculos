/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoVinculoDeHonorarioDoPagamentoEnum {
    DEBITOSRECLAMANTE("Descontos do Reclamante", "D"),
    OUTROSDEBITOSRECLAMADO("Outros D\u00e9bitos do Reclamado", "O"),
    DEBITOSCOBRARRECLAMANTE("D\u00e9bitos do Reclamante", "C");

    private String nome;
    private String valor;

    private TipoVinculoDeHonorarioDoPagamentoEnum(String nome, String valor) {
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

