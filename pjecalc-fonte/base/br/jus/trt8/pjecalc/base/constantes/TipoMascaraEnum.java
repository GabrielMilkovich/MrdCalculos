/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.constantes;

public enum TipoMascaraEnum {
    NENHUMA("", false),
    CPF("cpfMask", true),
    CNPJ("cnpjMask", true),
    CEI("ceiMask", true),
    PIS("pisPasepNitMask", true),
    PASEP("pisPasepNitMask", true),
    NIT("pisPasepNitMask", true),
    DINAMICA("dynamicMask", true),
    INTEIRO("integerMask", false),
    MOEDA("currencyMask", false),
    PERCENTUAL("percentMask", false),
    DECIMAL("decimalMask", false),
    TEXTONUMERO("textAndNumberMask", false);

    private String js;
    private boolean ignoraTamanho;

    private TipoMascaraEnum(String js, boolean ignoraTamanho) {
        this.js = js;
        this.ignoraTamanho = ignoraTamanho;
    }

    public String getJs() {
        return this.js;
    }

    public boolean getIgnoraTamanho() {
        return this.ignoraTamanho;
    }
}

