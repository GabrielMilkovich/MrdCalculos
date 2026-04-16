/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaType;
import java.lang.reflect.Field;

public class MetaField {
    private String name;
    private MetaType type;
    private Class<?> realType = null;
    private Field field;
    private boolean embedded = false;

    public MetaField() {
    }

    public MetaField(String name, MetaType type, Field field) {
        this();
        this.name = name;
        this.type = type;
        this.field = field;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public MetaType getType() {
        return this.type;
    }

    public void setType(MetaType type) {
        this.type = type;
    }

    public boolean isParametrized() {
        return this.realType != null;
    }

    public void setRealType(Class<?> realType) {
        this.realType = realType;
    }

    public Class<?> getRealType() {
        return this.realType;
    }

    public String getStringType() {
        if (this.isParametrized()) {
            return String.format("%s<%s>", this.getRealType().getSimpleName(), this.getType().getName());
        }
        return this.getType().getName();
    }

    public Field getField() {
        return this.field;
    }

    public void setField(Field field) {
        this.field = field;
    }

    public boolean isEmbedded() {
        return this.embedded;
    }

    public void setEmbedded(boolean embedded) {
        this.embedded = embedded;
    }

    public Object getValue(Object instance) throws Exception {
        this.field.setAccessible(true);
        Object value = this.field.get(instance);
        this.field.setAccessible(false);
        return value;
    }

    public void setValue(Object instance, Object value) throws Exception {
        this.field.setAccessible(true);
        this.field.set(instance, value);
        this.field.setAccessible(false);
    }

    public boolean isId() {
        return this.name.equals("id");
    }

    public String getGetMethodName() {
        return "get" + this.name.substring(0, 1).toUpperCase() + this.name.substring(1);
    }

    public String getSetMethodName() {
        return "set" + this.name.substring(0, 1).toUpperCase() + this.name.substring(1);
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.field == null ? 0 : this.field.hashCode());
        result = 31 * result + (this.name == null ? 0 : this.name.hashCode());
        result = 31 * result + (this.type == null ? 0 : this.type.hashCode());
        return result;
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        MetaField other = (MetaField)obj;
        if (this.field == null ? other.field != null : !this.field.equals(other.field)) {
            return false;
        }
        if (this.name == null ? other.name != null : !this.name.equals(other.name)) {
            return false;
        }
        return !(this.type == null ? other.type != null : !this.type.equals(other.type));
    }
}

