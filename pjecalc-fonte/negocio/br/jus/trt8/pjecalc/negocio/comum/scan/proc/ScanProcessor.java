/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.proc;

import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaEnum;

public interface ScanProcessor {
    public void scanClass(MetaClass var1) throws Exception;

    public void scanEnum(MetaEnum var1) throws Exception;

    public void process() throws Exception;
}

