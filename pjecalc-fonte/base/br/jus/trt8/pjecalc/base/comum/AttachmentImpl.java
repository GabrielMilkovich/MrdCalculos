/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.api.Attachment;

public class AttachmentImpl
implements Attachment {
    private String name;
    private String contentType;
    private byte[] data;

    public AttachmentImpl() {
    }

    public AttachmentImpl(String name, String contentType, byte[] data) {
        this.name = name;
        this.contentType = contentType;
        this.data = data;
    }

    @Override
    public String getName() {
        return this.name;
    }

    @Override
    public String getContentType() {
        return this.contentType;
    }

    @Override
    public byte[] getData() {
        return this.data;
    }
}

