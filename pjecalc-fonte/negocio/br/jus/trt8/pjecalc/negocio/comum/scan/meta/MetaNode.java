/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNodeType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MetaNode {
    private MetaNodeType type;
    private Object object;
    private MetaClass metaClass;
    private String name;
    private List<MetaNode> children = new ArrayList<MetaNode>();
    private Map<String, String> attributes = new LinkedHashMap<String, String>();
    private String collectionName = null;
    private String fieldNameId;
    private String idValue;

    public MetaNode() {
        this.type = MetaNodeType.OBJECT;
    }

    public MetaNode(String name, Object object, MetaClass metaClass, MetaNodeType type) {
        this();
        this.name = name;
        this.object = object;
        this.metaClass = metaClass;
        this.type = type;
    }

    public MetaNode findChildById(String id, Class<?> clazz) {
        String thisId = this.getIdValue();
        if (thisId != null && MetaNodeType.OBJECT.equals((Object)this.getType()) && thisId.equals(id) && clazz.isAssignableFrom(this.getMetaClass().getClazz())) {
            return this;
        }
        for (MetaNode child : this.children) {
            MetaNode node = child.findChildById(id, clazz);
            if (node == null) continue;
            return node;
        }
        return null;
    }

    public MetaNode findChild(Object object) {
        if (this.getObject() != null && this.getObject() == object) {
            return this;
        }
        for (MetaNode child : this.children) {
            MetaNode node = child.findChild(object);
            if (node == null) continue;
            return node;
        }
        return null;
    }

    public Object getObject() {
        return this.object;
    }

    public void setObject(Object object) {
        this.object = object;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<MetaNode> getChildren() {
        return this.children;
    }

    public MetaNode getFirstChild() {
        if (this.children.isEmpty()) {
            return null;
        }
        return this.children.get(0);
    }

    public void setChildren(List<MetaNode> children) {
        this.children = children;
    }

    public Map<String, String> getAttributes() {
        return this.attributes;
    }

    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }

    public MetaClass getMetaClass() {
        return this.metaClass;
    }

    public void setMetaClass(MetaClass metaClass) {
        this.metaClass = metaClass;
    }

    public MetaNodeType getType() {
        return this.type;
    }

    public String getCollectionName() {
        return this.collectionName;
    }

    public boolean isCollection() {
        return this.collectionName != null;
    }

    public void setCollectionName(String collectionName) {
        this.collectionName = collectionName;
    }

    public void setType(MetaNodeType type) {
        this.type = type;
    }

    public boolean isFieldNameId(String idName) {
        return this.fieldNameId != null && this.fieldNameId.equals(idName);
    }

    public String getFieldNameId() {
        return this.fieldNameId;
    }

    public void setFieldNameId(String fieldNameId) {
        this.fieldNameId = fieldNameId;
    }

    public String getIdValue() {
        return this.idValue;
    }

    public void setIdValue(String idValue) {
        this.idValue = idValue;
    }
}

