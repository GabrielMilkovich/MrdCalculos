/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  javax.persistence.Embedded
 *  javax.persistence.Entity
 *  javax.persistence.ManyToMany
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.negocio.comum.scan;

import br.jus.trt8.pjecalc.negocio.comum.SystemDeploymentStrategy;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaEnum;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaField;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaObject;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaType;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.ScanProcessor;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import org.jboss.seam.Component;

public class ScanProcessorEngine {
    public static final String PJECALC_DOMINIO_PACKAGE = "br.jus.trt8.pjecalc.negocio.dominio";
    public static final String PJECALC_CONST_PACKAGE = "br.jus.trt8.pjecalc.negocio.constantes";
    private static final String[] EXCEPTION_PACKAGE = new String[]{"formula", "historicosalarial", "ocorrenciaverba", "participante", "processo", "termo", "verbacalculo", "cartaodeponto", "pagamento"};
    private List<MetaType> types;
    private ScanProcessor generator;

    public ScanProcessorEngine(ScanProcessor generator) {
        this.generator = generator;
        this.types = new ArrayList<MetaType>();
    }

    public void process() throws Exception {
        Set<Class<?>> classes = ((SystemDeploymentStrategy)((Object)Component.getInstance(SystemDeploymentStrategy.class))).getClassesAnnotedWith(Entity.class);
        for (Class<?> clazz : classes) {
            if (!ScanProcessorEngine.isInsidePackageDominio(clazz.getPackage().getName())) continue;
            this.classToMetaClass(clazz);
        }
        for (MetaType type : this.types) {
            if (type instanceof MetaEnum) {
                this.generator.scanEnum((MetaEnum)type);
                continue;
            }
            if (((MetaClass)type).getClazz().equals(Calculo.class)) {
                ((MetaClass)type).setOwner(null);
            }
            this.generator.scanClass((MetaClass)type);
        }
        this.generator.process();
    }

    public static boolean isInsidePackageDominio(String packageName) {
        return packageName.startsWith(PJECALC_DOMINIO_PACKAGE);
    }

    public static boolean isInsidePackageConst(String packageName) {
        return packageName.startsWith(PJECALC_CONST_PACKAGE);
    }

    public static boolean isInsidePackageCalculo(String packageName) {
        String calculoPackage = "br.jus.trt8.pjecalc.negocio.dominio.calculo";
        if (packageName.startsWith(calculoPackage)) {
            return true;
        }
        for (String pk : EXCEPTION_PACKAGE) {
            calculoPackage = "br.jus.trt8.pjecalc.negocio.dominio." + pk;
            if (!packageName.startsWith(calculoPackage)) continue;
            return true;
        }
        return false;
    }

    private MetaType findType(String simpleName) {
        for (MetaType type : this.types) {
            if (!type.getName().equals(simpleName)) continue;
            return type;
        }
        return null;
    }

    private MetaEnum enumToMyEnum(Class<?> clazz) {
        MetaEnum myEnum = new MetaEnum(clazz.getSimpleName());
        myEnum.setPackageName(clazz.getPackage().getName());
        this.types.add(myEnum);
        for (Object v : clazz.getEnumConstants()) {
            myEnum.addValue(v.toString());
        }
        return myEnum;
    }

    private MetaClass classToMetaClass(Class<?> clazz) {
        MetaClass myClass = (MetaClass)this.findType(clazz.getSimpleName());
        if (myClass != null) {
            return myClass;
        }
        myClass = new MetaClass(clazz.getSimpleName(), clazz);
        myClass.setEmbedded(clazz.isAnnotationPresent(Embeddable.class));
        myClass.setPackageName(clazz.getPackage().getName());
        myClass.setExternal(!ScanProcessorEngine.isInsidePackageCalculo(clazz.getPackage().getName()));
        this.types.add(myClass);
        this.extractFields(myClass, clazz);
        return myClass;
    }

    private void extractFields(MetaClass myClass, Class<?> clazz) {
        for (Field field : clazz.getDeclaredFields()) {
            ParameterizedType pt;
            Type[] typeArray;
            int n;
            int n2;
            boolean isList = false;
            if (!(field.isAnnotationPresent(Embedded.class) || field.isAnnotationPresent(Column.class) || field.isAnnotationPresent(OneToOne.class) || field.isAnnotationPresent(ManyToMany.class) || field.isAnnotationPresent(ManyToOne.class))) {
                if (!field.isAnnotationPresent(OneToMany.class)) continue;
                isList = true;
                if (!true) continue;
            }
            MetaField myField = myClass.addField(field.getName(), null, field);
            myField.setEmbedded(field.isAnnotationPresent(Embedded.class));
            Class type = field.getType();
            if (isList && field.getGenericType() instanceof ParameterizedType && (n2 = 0) < (n = (typeArray = (pt = (ParameterizedType)field.getGenericType()).getActualTypeArguments()).length)) {
                Type t = typeArray[n2];
                type = (Class)t;
                myField.setRealType(field.getType());
            }
            if (ScanProcessorEngine.isInsidePackageDominio(type.getPackage().getName()) || ScanProcessorEngine.isInsidePackageConst(type.getPackage().getName())) {
                boolean isMappedBy = false;
                OneToOne annotation = field.getAnnotation(OneToOne.class);
                if (annotation != null && annotation instanceof OneToOne) {
                    isMappedBy = !annotation.mappedBy().equals("");
                } else {
                    annotation = field.getAnnotation(OneToMany.class);
                    if (annotation != null && annotation instanceof OneToMany) {
                        isMappedBy = !((OneToMany)annotation).mappedBy().equals("");
                    }
                }
                MetaType subType = this.findType(type.getSimpleName());
                if (subType == null) {
                    subType = type.isEnum() ? this.enumToMyEnum(type) : this.classToMetaClass(type);
                }
                if (isMappedBy) {
                    subType.setOwner(myClass);
                }
                myField.setType(subType);
                myClass.getImports().add(((MetaObject)subType).getPackageName());
                continue;
            }
            myField.setType(new MetaType(type.getSimpleName()));
        }
        if (!clazz.getSuperclass().getSimpleName().equals("Object")) {
            this.extractFields(myClass, clazz.getSuperclass());
        }
    }
}

