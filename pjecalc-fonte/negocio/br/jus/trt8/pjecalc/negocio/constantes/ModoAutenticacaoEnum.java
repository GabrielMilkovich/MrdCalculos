/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum ModoAutenticacaoEnum {
    CERTIFICADO_DIGITAL("Certificado Digital", "0"),
    USUARIO_SENHA("Usu\u00e1rio/Senha", "1");

    private String nome;
    private String valor;

    private ModoAutenticacaoEnum(String nome, String valor) {
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

