/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.selic;

import br.jus.trt8.pjecalc.negocio.dominio.indices.RepositorioDeIndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIndiceSelicDiaria")
public class RepositorioDeIndiceSelicDiaria
extends RepositorioDeIndiceBase<IndiceSelicDiaria> {
    public RepositorioDeIndiceSelicDiaria() {
        super(IndiceSelicDiaria.class);
    }
}

