/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional;

import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.RepositorioDeSalarioMinimoBase;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoNacional;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeSalarioMinimoNacional")
public class RepositorioDeSalarioMinimoNacional
extends RepositorioDeSalarioMinimoBase<SalarioMinimoNacional> {
    public RepositorioDeSalarioMinimoNacional() {
        super(SalarioMinimoNacional.class);
    }
}

