/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.perfil;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.perfil.Perfil;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDePerfil")
public class RepositorioDePerfil
extends RepositorioBase<Perfil> {
    public RepositorioDePerfil() {
        super(Perfil.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<Perfil> obterTodos() {
        return super.obterTodos();
    }

    public Perfil obterPerfilDoUsuario(Usuario usuario) {
        return (Perfil)this.obterEntidadeBase("from Perfil p where p.cpf=?", usuario.getLogin());
    }

    public Perfil obterPerfilDoUsuario(String cpf) {
        return (Perfil)this.obterEntidadeBase("from Perfil p where p.cpf=?", cpf);
    }
}

