/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNode;

public enum MetaNodeType {
    OBJECT(null),
    COLLECTION(null),
    ATTRIBUTE(null),
    INT_REFERENCE("internalRef"),
    EXT_REFERENCE("externalRef");

    private String tagName;

    private MetaNodeType(String tagName) {
        this.tagName = tagName;
    }

    public String getTagName() {
        return this.tagName;
    }

    public String tagName(MetaNode metaNode) {
        switch (this) {
            case OBJECT: {
                return metaNode.getMetaClass().getName();
            }
            case COLLECTION: {
                return metaNode.getCollectionName();
            }
            case ATTRIBUTE: {
                return metaNode.getName();
            }
            case EXT_REFERENCE: {
                return MetaNodeType.EXT_REFERENCE.tagName;
            }
            case INT_REFERENCE: {
                return MetaNodeType.INT_REFERENCE.tagName;
            }
        }
        return null;
    }

    public String startTag(MetaNode metaNode) {
        return String.format("<%s>", this.tagName(metaNode));
    }

    public String endTag(MetaNode metaNode) {
        return String.format("</%s>", this.tagName(metaNode));
    }

    public String betweenTag(String attrName, String value) {
        return String.format("<%s>%s</%s>", attrName, value, attrName);
    }

    public String betweenTag(MetaNode metaNode, String value) {
        return String.format("%s%s%s", this.startTag(metaNode), value, this.endTag(metaNode));
    }
}

