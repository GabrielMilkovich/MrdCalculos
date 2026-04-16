/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado;

import br.jus.trt8.pjecalc.negocio.dominio.inss.RepositorioDeTabelaPrevidenciaria;
import br.jus.trt8.pjecalc.negocio.dominio.inss.seguradoempregado.TabelaPrevidenciariaSeguradoEmpregado;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeTabelaPrevidenciariaDoSeguradoEmpregado")
public class RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado
extends RepositorioDeTabelaPrevidenciaria<TabelaPrevidenciariaSeguradoEmpregado> {
    public RepositorioDeTabelaPrevidenciariaDoSeguradoEmpregado() {
        super(TabelaPrevidenciariaSeguradoEmpregado.class);
    }
}

