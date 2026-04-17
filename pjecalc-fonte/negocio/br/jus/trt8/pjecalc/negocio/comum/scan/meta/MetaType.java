/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

public class MetaType {
    private String name;
    private MetaType owner = null;

    public MetaType() {
    }

    public MetaType(String name) {
        this();
        this.name = name;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public MetaType getOwner() {
        return this.owner;
    }

    public void setOwner(MetaType owner) {
        this.owner = owner;
    }

    public boolean isChildFrom(Class<?> clazz) {
        return this.owner != null && this.owner.getName().equals(clazz.getSimpleName());
    }
}

