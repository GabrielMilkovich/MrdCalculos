/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.proc;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.scan.ScanProcessorEngine;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaEnum;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaField;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNode;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaNodeType;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.ScanProcessor;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import java.io.File;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.Map;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.Text;

public class XMLImpScanProcessor
implements ScanProcessor {
    private File file;
    private Calculo calculo;
    private Map<String, MetaClass> classes;
    private MetaNode rootNode;

    public XMLImpScanProcessor(File file) {
        this.file = file;
        this.classes = new LinkedHashMap<String, MetaClass>();
    }

    @Override
    public void process() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document document = builder.parse(this.file);
        this.preProcess(document.getFirstChild(), Calculo.class.getSimpleName());
        this.calculo = (Calculo)this.toObject(this.rootNode);
    }

    private Node getFirstNode(Node node) {
        Node child = node.getFirstChild();
        if (child instanceof Text) {
            if (child.getFirstChild() == null) {
                return null;
            }
            return child.getFirstChild().getNextSibling();
        }
        return child;
    }

    public MetaNode preProcess(Node node, String className) throws Exception {
        MetaClass metaClass = this.classes.get(className);
        if (metaClass == null) {
            return null;
        }
        MetaNode metaNode = new MetaNode(metaClass.getName(), null, metaClass, MetaNodeType.OBJECT);
        if (this.rootNode == null) {
            this.rootNode = metaNode;
        }
        for (int i = 0; i < node.getChildNodes().getLength(); ++i) {
            Node child = node.getChildNodes().item(i);
            if (child instanceof Text) continue;
            MetaField metaField = metaClass.getField(child.getNodeName());
            if (metaField != null) {
                String value = child.getTextContent().trim();
                if (value.equals("null")) {
                    metaNode.getAttributes().put(metaField.getName(), value);
                    continue;
                }
                if (this.isCollection(metaField.getField().getType())) {
                    Node collectionNode = this.getFirstNode(child);
                    MetaNode metaCollectionNode = new MetaNode(metaField.getName(), null, null, MetaNodeType.COLLECTION);
                    metaCollectionNode.setCollectionName(collectionNode.getNodeName());
                    metaNode.getChildren().add(metaCollectionNode);
                    for (int e = 0; e < collectionNode.getChildNodes().getLength(); ++e) {
                        MetaNode item;
                        Node itemChild = collectionNode.getChildNodes().item(e);
                        if (itemChild instanceof Text || (item = this.preProcess(itemChild, itemChild.getNodeName())) == null) continue;
                        metaCollectionNode.getChildren().add(item);
                    }
                    continue;
                }
                if (ScanProcessorEngine.isInsidePackageDominio(metaField.getField().getType().getPackage().getName())) {
                    MetaNode attrNode = new MetaNode(metaField.getName(), null, null, MetaNodeType.ATTRIBUTE);
                    metaNode.getChildren().add(attrNode);
                    Node refNode = this.getFirstNode(child);
                    if (refNode == null) continue;
                    MetaNode item = this.preProcess(refNode, refNode.getNodeName());
                    attrNode.getChildren().add(item);
                    continue;
                }
                metaNode.getAttributes().put(metaField.getName(), value);
                if (!metaField.isId()) continue;
                metaNode.setFieldNameId(metaField.getName());
                metaNode.setIdValue(value);
                continue;
            }
            if (child.getNodeName().equals(MetaNodeType.EXT_REFERENCE.getTagName())) {
                metaNode.setType(MetaNodeType.EXT_REFERENCE);
                metaNode.getAttributes().put("id", child.getTextContent().trim());
                metaNode.setIdValue(child.getTextContent().trim());
                return metaNode;
            }
            if (!child.getNodeName().equals(MetaNodeType.INT_REFERENCE.getTagName())) continue;
            metaNode.setType(MetaNodeType.INT_REFERENCE);
            metaNode.getAttributes().put("id", child.getTextContent().trim());
            metaNode.setIdValue(child.getTextContent().trim());
            return metaNode;
        }
        if (MetaNodeType.OBJECT.equals((Object)metaNode.getType())) {
            metaNode.setObject(metaClass.getClazz().newInstance());
        }
        return metaNode;
    }

    public Object toObject(MetaNode node) throws Exception {
        MetaClass metaClass = node.getMetaClass();
        if (MetaNodeType.EXT_REFERENCE.equals((Object)node.getType())) {
            Constructor<?> constructor = metaClass.getKeyType().getField().getType().getConstructor(String.class);
            Object id = constructor.newInstance(node.getAttributes().get("id"));
            EntidadeBase entidadeBase = (EntidadeBase)metaClass.getClazz().newInstance();
            if (entidadeBase instanceof Feriado) {
                Feriado feriado = Feriado.obterPorUid((String)id);
                id = Utils.naoNulo(feriado) ? feriado.getId() : -1L;
            }
            entidadeBase = entidadeBase.restaurar(entidadeBase.getClass(), id);
            return entidadeBase;
        }
        if (MetaNodeType.INT_REFERENCE.equals((Object)node.getType())) {
            String id = node.getIdValue();
            if (id == null) {
                return null;
            }
            MetaNode otherMetaNode = this.rootNode.findChildById(id, metaClass.getClazz());
            if (otherMetaNode != null) {
                node.setObject(otherMetaNode.getObject());
                return node.getObject();
            }
            return null;
        }
        Object object = node.getObject();
        block0: for (String attribute : node.getAttributes().keySet()) {
            Object constructor;
            String value = node.getAttributes().get(attribute);
            MetaField metaField = node.getMetaClass().getField(attribute);
            if (value.equals("null")) {
                metaClass.setFieldValue(object, metaField, null);
                continue;
            }
            if (node.isFieldNameId(attribute)) {
                if (ScanProcessorEngine.isInsidePackageCalculo(metaClass.getPackageName())) continue;
                constructor = metaField.getField().getType().getConstructor(String.class);
                metaClass.setFieldValue(object, metaField, ((Constructor)constructor).newInstance(value));
                continue;
            }
            if (metaField.getField().getType().equals(Date.class)) {
                metaClass.setFieldValue(object, metaField, new Date(Long.parseLong(value)));
                continue;
            }
            if (metaField.getField().getType().isEnum()) {
                metaClass.setFieldValue(object, metaField, null);
                for (Field field : metaField.getField().getType().getFields()) {
                    if (!field.getName().equals(value)) continue;
                    Object enumValue = Enum.valueOf(metaField.getField().getType(), field.getName());
                    metaClass.setFieldValue(object, metaField, enumValue);
                    continue block0;
                }
                continue;
            }
            constructor = metaField.getField().getType().getConstructor(String.class);
            metaClass.setFieldValue(object, metaField, ((Constructor)constructor).newInstance(value));
        }
        for (MetaNode child : node.getChildren()) {
            MetaField metaField = node.getMetaClass().getField(child.getName());
            if (this.isCollection(metaField.getField().getType()) && !child.getChildren().isEmpty()) {
                Collection<?> collection = (Collection<?>)metaClass.getFieldValue(object, metaField);
                if (collection == null) {
                    collection = this.createCollection(child.getCollectionName(), metaField.getType().getClass());
                    metaClass.setFieldValue(object, metaField, collection);
                }
                for (MetaNode item : child.getChildren()) {
                    Object itemObject = this.toObject(item);
                    if (item == null) continue;
                    collection.add(itemObject);
                }
                continue;
            }
            MetaNode attrNode = child.getFirstChild();
            if (attrNode == null) continue;
            metaClass.setFieldValue(object, metaField, this.toObject(attrNode));
        }
        return object;
    }

    @Override
    public void scanClass(MetaClass myClass) throws Exception {
        this.classes.put(myClass.getClazz().getSimpleName(), myClass);
    }

    @Override
    public void scanEnum(MetaEnum myEnum) throws Exception {
    }

    private <E> Collection<E> createCollection(String collectionName, Class<E> clazz) {
        if (collectionName.equals("Set")) {
            return new HashSet();
        }
        if (collectionName.equals("List")) {
            return new LinkedList();
        }
        return null;
    }

    private boolean isCollection(Class<?> type) {
        if (type.getSimpleName().equals("Set") || type.getSimpleName().equals("List")) {
            return true;
        }
        for (Class<?> ints : type.getInterfaces()) {
            if (!ints.getSimpleName().equals("Set") && !ints.getSimpleName().equals("List")) continue;
            return true;
        }
        return false;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }
}

