/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum PapelEnum {
    CALCULISTA("Calculista", "C"),
    GESTOR_REGIONAL("Gestor Regional", "R"),
    GESTOR_NACIONAL("Gestor Nacional", "N"),
    OFFLINE("Offline", "O");

    private String nome;
    private String valor;

    private PapelEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static PapelEnum parseValor(String valor) {
        for (PapelEnum papelEnum : PapelEnum.values()) {
            if (!papelEnum.getValor().equals(valor)) continue;
            return papelEnum;
        }
        return null;
    }

    public static PapelEnum[] parseValores(String valores) {
        PapelEnum[] papeis = new PapelEnum[valores.length()];
        for (int i = 0; i < valores.length(); ++i) {
            papeis[i] = PapelEnum.parseValor(valores.charAt(i) + "");
        }
        return papeis;
    }
}

