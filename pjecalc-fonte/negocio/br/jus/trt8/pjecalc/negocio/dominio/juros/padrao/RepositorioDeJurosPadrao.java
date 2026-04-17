/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.padrao;

import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.RepositorioDeJurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.padrao.JurosPadrao;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosPadrao")
public class RepositorioDeJurosPadrao
extends RepositorioDeJurosBase<JurosPadrao> {
    public RepositorioDeJurosPadrao() {
        super(JurosPadrao.class);
    }

    @Override
    protected void remover(JurosPadrao entidade) {
        super.remover(entidade);
        List lista = this.obterTodos();
        if (!lista.isEmpty()) {
            JurosBase jurosBase = (JurosBase)lista.get(0);
            jurosBase.setDataFim(null);
            jurosBase.salvar();
        }
    }
}

