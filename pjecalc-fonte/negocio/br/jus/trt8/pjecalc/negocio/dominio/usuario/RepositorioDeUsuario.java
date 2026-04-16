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
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeUsuario")
public class RepositorioDeUsuario
extends RepositorioBase<Usuario> {
    public RepositorioDeUsuario() {
        super(Usuario.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public Usuario obterUsuarioAtivo(String login) {
        return (Usuario)this.obterEntidadeBase("from Usuario u where u.login=? and u.ativo=?", login, true);
    }

    @Override
    public List<Usuario> obterTodos() {
        return super.obterTodos();
    }

    @Override
    public void salvar(Usuario usuario) {
        super.salvar(usuario);
    }
}

