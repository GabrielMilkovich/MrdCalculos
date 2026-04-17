/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.ipca;

import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipca.IndiceIPCA;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndiceIPCA")
public class RepositorioDeIndiceIPCA
extends RepositorioDeIndiceBase<IndiceIPCA> {
    public RepositorioDeIndiceIPCA() {
        super(IndiceIPCA.class);
    }
}

