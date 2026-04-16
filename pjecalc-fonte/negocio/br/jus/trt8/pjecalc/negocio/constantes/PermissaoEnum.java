/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum PermissaoEnum {
    CONSULTA("Consulta", "C"),
    MANUTENCAO("Manuten\u00e7\u00e3o", "M"),
    TUDO("Tudo", "T");

    private String nome;
    private String valor;

    private PermissaoEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public static PermissaoEnum parseValor(String valor) {
        for (PermissaoEnum papelEnum : PermissaoEnum.values()) {
            if (!papelEnum.getValor().equals(valor)) continue;
            return papelEnum;
        }
        return null;
    }

    public static PermissaoEnum[] parseValores(String valores) {
        PermissaoEnum[] permissoes = new PermissaoEnum[valores.length()];
        for (int i = 0; i < valores.length(); ++i) {
            permissoes[i] = PermissaoEnum.parseValor(valores.charAt(i) + "");
        }
        return permissoes;
    }
}

