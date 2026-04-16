/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum IndicesAcumuladosEnum {
    MES_SUBSEQUENTE_AO_VENCIMENTO("A partir do m\u00eas subsequente ao vencimento das verbas", "MSV"),
    MES_DO_VENCIMENTO("A partir do m\u00eas de vencimento das verbas", "MV"),
    MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO("A partir do m\u00eas subsequente ao vencimento das verbas mensais e a partir do m\u00eas de vencimento das verbas anuais e rescis\u00f3rias", "MSMV"),
    ATUALIZACAO_CALCULO("Para uso nas atualiza\u00e7\u00f5es de c\u00e1lculo", "AC");

    private String nome;
    private String valor;

    private IndicesAcumuladosEnum(String nome, String valor) {
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

