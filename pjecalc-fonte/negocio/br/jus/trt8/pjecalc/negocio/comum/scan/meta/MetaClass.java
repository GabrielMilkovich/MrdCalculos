/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.proxy.HibernateProxyHelper
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaField;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaObject;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaType;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.proxy.HibernateProxyHelper;

public class MetaClass
extends MetaObject {
    private List<MetaField> fields = new ArrayList<MetaField>();
    private Class<?> clazz;
    private boolean external;
    private boolean embedded;

    public MetaClass(String name, Class<?> clazz) {
        super(name);
        this.clazz = clazz;
        this.external = false;
        this.embedded = false;
    }

    public List<MetaField> getFields() {
        return this.fields;
    }

    public void setFields(List<MetaField> fields) {
        this.fields = fields;
    }

    public MetaField getField(String name) {
        for (MetaField field : this.fields) {
            if (!field.getName().equals(name)) continue;
            return field;
        }
        return null;
    }

    public MetaField addField(String name, MetaType type, Field field) {
        MetaField myField = new MetaField(name, type, field);
        this.fields.add(myField);
        return myField;
    }

    public Class<?> getClazz() {
        return this.clazz;
    }

    public boolean isExternal() {
        return this.external;
    }

    public void setExternal(boolean external) {
        this.external = external;
    }

    public boolean isEmbedded() {
        return this.embedded;
    }

    public void setEmbedded(boolean embedded) {
        this.embedded = embedded;
    }

    public MetaField getKeyType() {
        if (this.clazz.equals(Estado.class)) {
            return this.getField("sigla");
        }
        if (this.clazz.equals(Feriado.class)) {
            return this.getField("uid");
        }
        return this.getField("id");
    }

    private Class<?> getRealClass(Object object) {
        return HibernateProxyHelper.getClassWithoutInitializingProxy((Object)object);
    }

    public Object getFieldValue(Object instance, MetaField metaField) throws Exception {
        try {
            return this.getRealClass(instance).getMethod(metaField.getGetMethodName(), new Class[0]).invoke(instance, new Object[0]);
        }
        catch (NoSuchMethodException e) {
            return metaField.getValue(instance);
        }
    }

    public void setFieldValue(Object instance, MetaField metaField, Object value) throws Exception {
        try {
            this.getRealClass(instance).getMethod(metaField.getSetMethodName(), metaField.getField().getType()).invoke(instance, value);
        }
        catch (NoSuchMethodException e) {
            metaField.setValue(instance, value);
        }
    }
}

