/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum IncidenciaDeMultaDoFgtsEnum {
    SOBRE_O_TOTAL_DEVIDO("Sobre devido", "STD"),
    SOBRE_DEPOSITADO_SACADO("Sobre saldo e/ou saque", "SDS"),
    SOBRE_DIFERENCA("Sobre diferen\u00e7a", "SDF"),
    SOBRE_TOTAL_DEVIDO_MAIS_SAQUE_E_OU_SALDO("Sobre devido + saldo e/ou saque", "TDA"),
    SOBRE_TOTAL_DEVIDO_MENOS_SAQUE_E_OU_SALDO("Sobre devido - saldo e/ou saque", "TDE");

    private String nome;
    private String valor;

    private IncidenciaDeMultaDoFgtsEnum(String nome, String valor) {
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

