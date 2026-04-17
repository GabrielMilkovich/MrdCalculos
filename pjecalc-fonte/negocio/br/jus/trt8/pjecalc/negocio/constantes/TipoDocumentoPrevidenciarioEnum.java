/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDocumentoPrevidenciarioEnum {
    PIS,
    PASEP,
    NIT;


    public String getValor() {
        return this.name();
    }
}

