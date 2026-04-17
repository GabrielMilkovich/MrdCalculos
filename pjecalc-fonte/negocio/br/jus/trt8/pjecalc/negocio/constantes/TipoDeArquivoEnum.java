/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

public enum TipoDeArquivoEnum {
    HTML("text/html; charset=iso-8859-1", "html"),
    PDF("application/pdf", "pdf"),
    PJC("application/zip; charset=iso-8859-1", "PJC");

    private String contentType;
    private String extensao;

    private TipoDeArquivoEnum(String contentType, String extensao) {
        this.contentType = contentType;
        this.extensao = extensao;
    }

    public String getContentType() {
        return this.contentType;
    }

    public String getExtensao() {
        return this.extensao;
    }
}

