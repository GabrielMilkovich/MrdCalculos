/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.usuario;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.SetorUsuario;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeSetorUsuario")
public class RepositorioDeSetorUsuario
extends RepositorioBase<SetorUsuario> {
    public RepositorioDeSetorUsuario() {
        super(SetorUsuario.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(SetorUsuario setorUsuario) {
        super.salvar(setorUsuario);
    }
}

