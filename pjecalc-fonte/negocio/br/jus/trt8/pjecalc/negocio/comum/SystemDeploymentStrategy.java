/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Create
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.deployment.AnnotationDeploymentHandler
 *  org.jboss.seam.deployment.ClassDeploymentHandler
 *  org.jboss.seam.deployment.ClassDescriptor
 *  org.jboss.seam.deployment.DeploymentHandler
 *  org.jboss.seam.deployment.DeploymentStrategy
 */
package br.jus.trt8.pjecalc.negocio.comum;

import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Create;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.deployment.AnnotationDeploymentHandler;
import org.jboss.seam.deployment.ClassDeploymentHandler;
import org.jboss.seam.deployment.ClassDescriptor;
import org.jboss.seam.deployment.DeploymentHandler;
import org.jboss.seam.deployment.DeploymentStrategy;

@Name(value="systemDeploymentStrategy")
@Scope(value=ScopeType.APPLICATION)
@AutoCreate
public class SystemDeploymentStrategy
extends DeploymentStrategy {
    public static final String SCAN_RESOURCE = "seam.properties";
    public static final String HANDLER_KEY = "org.jboss.seam.deployment.deploymentHandlers";
    public static final String ANNOTATION_APRESENTADOR = "br.jus.trt8.pjecalc.web.comum.anotacoes.Apresentador";
    public static final String ANNOTATION_EXCECAO_MAPEADA = "br.jus.trt8.pjecalc.negocio.comum.annotations.ExcecaoMapeada";
    public static final String ANNOTATION_TABLE = "javax.persistence.Table";
    public static final String ANNOTATION_ENTITY = "javax.persistence.Entity";
    private ClassLoader classLoader;
    private Map<String, DeploymentHandler> deploymentHandlers;
    private ClassDeploymentHandler handler;

    @Create
    public void init() {
        Locale.setDefault(new Locale("pt", "BR"));
        this.classLoader = Thread.currentThread().getContextClassLoader();
        this.deploymentHandlers = new HashMap<String, DeploymentHandler>();
        ArrayList<String> annotationTypes = new ArrayList<String>();
        annotationTypes.add(ANNOTATION_APRESENTADOR);
        annotationTypes.add(ANNOTATION_EXCECAO_MAPEADA);
        annotationTypes.add(ANNOTATION_TABLE);
        annotationTypes.add(ANNOTATION_ENTITY);
        this.deploymentHandlers.put(HANDLER_KEY, (DeploymentHandler)new AnnotationDeploymentHandler(annotationTypes, this.getClassLoader()));
        this.scan();
    }

    public void scan() {
        this.getScanner().scanResources(new String[]{SCAN_RESOURCE});
        this.handler = (ClassDeploymentHandler)this.getDeploymentHandlers().get(HANDLER_KEY);
    }

    public Set<Class<?>> getClassesAnnotedWith(Class<? extends Annotation> annotationType) {
        HashSet classes = new HashSet();
        for (ClassDescriptor clazz : this.handler.getClasses()) {
            if (!clazz.getClazz().isAnnotationPresent(annotationType)) continue;
            classes.add(clazz.getClazz());
        }
        return classes;
    }

    protected String getDeploymentHandlersKey() {
        return HANDLER_KEY;
    }

    public Map<String, DeploymentHandler> getDeploymentHandlers() {
        return this.deploymentHandlers;
    }

    public ClassLoader getClassLoader() {
        return this.classLoader;
    }
}

