/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInss;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeInssSobreSalariosPagos")
public class RepositorioDeOcorrenciaDeInssSobreSalariosPagos
extends RepositorioDeOcorrenciaDeInss<OcorrenciaDeInssSobreSalariosPagos> {
    public RepositorioDeOcorrenciaDeInssSobreSalariosPagos() {
        super(OcorrenciaDeInssSobreSalariosPagos.class);
    }
}

