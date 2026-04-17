/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao
 *  org.hibernate.proxy.HibernateProxyHelper
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.proc;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaEnum;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaField;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNode;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNodeType;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.ScanProcessor;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.XMLExpScanProcessorUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import java.io.Writer;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import org.hibernate.proxy.HibernateProxyHelper;

public class XMLExpScanProcessor
implements ScanProcessor {
    private Calculo calculo;
    private Writer writer;
    private PJeCalcImportacao pjecalcImportacao;
    private Map<Class<?>, MetaClass> classes;
    private MetaNode rootNode;

    public XMLExpScanProcessor(Calculo calculo, Writer writer, PJeCalcImportacao pjecalcImportacao) {
        this.calculo = calculo;
        this.writer = writer;
        this.pjecalcImportacao = pjecalcImportacao;
        this.classes = new LinkedHashMap();
    }

    @Override
    public void process() throws Exception {
        this.preProcess(null, null, this.calculo);
        this.writer.append("<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>");
        this.writer.append(this.toXML());
    }

    @Override
    public void scanClass(MetaClass myClass) throws Exception {
        this.classes.put(myClass.getClazz(), myClass);
    }

    @Override
    public void scanEnum(MetaEnum myEnum) throws Exception {
    }

    private Class<?> getRealClass(Object object) {
        return HibernateProxyHelper.getClassWithoutInitializingProxy((Object)object);
    }

    public void preProcess(MetaNode nodeOwner, MetaClass classOwner, Object object) throws Exception {
        Class clazz = HibernateProxyHelper.getClassWithoutInitializingProxy((Object)object);
        MetaClass metaClass = this.classes.get(clazz);
        MetaNode node = new MetaNode(metaClass.getName(), object, metaClass, MetaNodeType.OBJECT);
        MetaNode reference = null;
        if (this.rootNode != null) {
            reference = this.rootNode.findChild(object);
        } else {
            this.rootNode = node;
        }
        if (nodeOwner != null) {
            nodeOwner.getChildren().add(node);
        }
        if (metaClass.isExternal()) {
            node.setType(MetaNodeType.EXT_REFERENCE);
            return;
        }
        if (reference != null) {
            if (metaClass.getOwner() != null && classOwner != null && metaClass.getOwner().equals(classOwner)) {
                if (MetaNodeType.OBJECT.equals((Object)reference.getType())) {
                    reference.setType(MetaNodeType.INT_REFERENCE);
                    node.getAttributes().putAll(reference.getAttributes());
                    node.getChildren().addAll(reference.getChildren());
                    reference.getAttributes().clear();
                    reference.getChildren().clear();
                    return;
                }
            } else {
                node.setType(MetaNodeType.INT_REFERENCE);
                return;
            }
        }
        for (MetaField metaField : metaClass.getFields()) {
            Object value = metaClass.getFieldValue(object, metaField);
            if (value == null) {
                node.getAttributes().put(metaField.getName(), value + "");
                continue;
            }
            if (value instanceof Date) {
                node.getAttributes().put(metaField.getName(), ((Date)value).getTime() + "");
                continue;
            }
            if (value instanceof Collection) {
                String collectionName = Collection.class.getSimpleName();
                for (Class<?> ints : this.getRealClass(value).getInterfaces()) {
                    if (!ints.getSimpleName().equals("List") && !ints.getSimpleName().equals("Set")) continue;
                    collectionName = ints.getSimpleName();
                }
                MetaNode collectionNode = new MetaNode(metaField.getName(), value, null, MetaNodeType.COLLECTION);
                collectionNode.setCollectionName(collectionName);
                node.getChildren().add(collectionNode);
                for (Object item : (Collection)value) {
                    this.preProcess(collectionNode, node.getMetaClass(), item);
                }
                continue;
            }
            if (!(value instanceof Enum) && value != null && this.getRealClass(value).getPackage().getName().startsWith("br.jus.trt8.pjecalc.negocio.dominio")) {
                MetaNode attrNode = new MetaNode(metaField.getName(), null, null, MetaNodeType.ATTRIBUTE);
                node.getChildren().add(attrNode);
                this.preProcess(attrNode, node.getMetaClass(), value);
                continue;
            }
            node.getAttributes().put(metaField.getName(), XMLExpScanProcessorUtils.escaparTexto(value.toString()));
            if (!metaField.isId()) continue;
            node.setFieldNameId(metaField.getName());
            node.setIdValue(value.toString());
        }
    }

    private Object getId(Object object) throws Exception {
        if (object instanceof Feriado) {
            return this.getRealClass(object).getMethod("getUid", new Class[0]).invoke(object, new Object[0]);
        }
        try {
            return this.getRealClass(object).getMethod("getId", new Class[0]).invoke(object, new Object[0]);
        }
        catch (NoSuchMethodException e) {
            return this.getRealClass(object).getMethod("obterChavePrimaria", new Class[0]).invoke(object, new Object[0]);
        }
    }

    private String toXML() throws Exception {
        StringBuilder str = new StringBuilder();
        this.toXML(str, this.rootNode);
        return str.toString();
    }

    private void toXML(StringBuilder str, MetaNode node) throws Exception {
        str.append(node.getType().startTag(node));
        if (node.equals(this.rootNode) && Utils.naoNulo(this.pjecalcImportacao)) {
            str.append(XMLExpScanProcessorUtils.escreverDadosEstruturados(this.pjecalcImportacao));
        }
        for (String attrName : node.getAttributes().keySet()) {
            str.append(MetaNodeType.ATTRIBUTE.betweenTag(attrName, node.getAttributes().get(attrName)));
        }
        for (MetaNode child : node.getChildren()) {
            if (MetaNodeType.OBJECT.equals((Object)child.getType())) {
                this.toXML(str, child);
                continue;
            }
            if (MetaNodeType.COLLECTION.equals((Object)child.getType())) {
                str.append(MetaNodeType.ATTRIBUTE.startTag(child));
                str.append(MetaNodeType.COLLECTION.startTag(child));
                for (MetaNode collectionNode : child.getChildren()) {
                    this.toXML(str, collectionNode);
                }
                str.append(MetaNodeType.COLLECTION.endTag(child));
                str.append(MetaNodeType.ATTRIBUTE.endTag(child));
                continue;
            }
            if (MetaNodeType.ATTRIBUTE.equals((Object)child.getType())) {
                this.toXML(str, child);
                continue;
            }
            Object id = this.getId(child.getObject());
            if (id != null) {
                str.append(MetaNodeType.OBJECT.startTag(child));
                str.append(child.getType().betweenTag(child, id.toString()));
                str.append(MetaNodeType.OBJECT.endTag(child));
                continue;
            }
            str.append(child.getType().betweenTag(child, "null"));
        }
        str.append(node.getType().endTag(node));
    }
}

