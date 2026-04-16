/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.meta;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaObject;
import java.util.ArrayList;
import java.util.List;

public class MetaEnum
extends MetaObject {
    private List<String> values = new ArrayList<String>();

    public MetaEnum(String name) {
        super(name);
    }

    public List<String> getValues() {
        return this.values;
    }

    public void setValues(List<String> values) {
        this.values = values;
    }

    public String addValue(String value) {
        this.values.add(value);
        return value;
    }
}

