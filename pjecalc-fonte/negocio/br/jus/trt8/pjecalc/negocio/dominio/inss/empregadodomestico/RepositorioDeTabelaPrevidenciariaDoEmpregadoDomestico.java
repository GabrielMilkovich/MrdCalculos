/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico;

import br.jus.trt8.pjecalc.negocio.dominio.inss.RepositorioDeTabelaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.empregadodomestico.TabelaPrevidenciariaEmpregadoDomestico;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTabelaPrevidenciariaDoEmpregadoDomestico")
public class RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico
extends RepositorioDeTabelaPrevidenciaria<TabelaPrevidenciariaEmpregadoDomestico> {
    public RepositorioDeTabelaPrevidenciariaDoEmpregadoDomestico() {
        super(TabelaPrevidenciariaEmpregadoDomestico.class);
    }
}

