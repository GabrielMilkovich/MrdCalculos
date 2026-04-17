/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum DestinoDoFgtsEnum {
    PAGAR("Pagar", "P", "Para pagamento ao reclamante"),
    DEPOSITAR("Recolher", "D", "Para dep\u00f3sito em conta vinculada");

    private String nome;
    private String valor;
    private String mensagem;

    private DestinoDoFgtsEnum(String nome, String valor, String mensagem) {
        this.nome = nome;
        this.valor = valor;
        this.mensagem = mensagem;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public String getMensagem() {
        return this.mensagem;
    }
}

