/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaType;
import java.io.File;
import java.util.HashSet;
import java.util.Set;

public class MetaObject
extends MetaType {
    private String packageName;
    private Set<String> imports = new HashSet<String>();

    public MetaObject(String name) {
        super(name);
    }

    public String getPackageName() {
        return this.packageName;
    }

    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public Set<String> getImports() {
        return this.imports;
    }

    public void setImports(Set<String> imports) {
        this.imports = imports;
    }

    public String getPackageNameDir() {
        return this.packageName.replace('.', File.separator.charAt(0));
    }
}

