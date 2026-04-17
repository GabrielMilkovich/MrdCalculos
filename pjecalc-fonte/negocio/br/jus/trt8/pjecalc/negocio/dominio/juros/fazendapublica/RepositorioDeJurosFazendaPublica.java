/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica;

import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.RepositorioDeJurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica.JurosFazendaPublica;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosFazendaPublica")
public class RepositorioDeJurosFazendaPublica
extends RepositorioDeJurosBase<JurosFazendaPublica> {
    public RepositorioDeJurosFazendaPublica() {
        super(JurosFazendaPublica.class);
    }

    @Override
    protected void remover(JurosFazendaPublica entidade) {
        super.remover(entidade);
        List lista = this.obterTodos();
        if (!lista.isEmpty()) {
            JurosBase jurosBase = (JurosBase)lista.get(0);
            jurosBase.setDataFim(null);
            jurosBase.salvar();
        }
    }
}

