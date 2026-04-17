/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.controle;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.controle.ControleAtualizacaoTabelas;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeControleAtualizacaoTabelas")
public class RepositorioControleAtualizacaoTabelas
extends RepositorioBase<ControleAtualizacaoTabelas> {
    public RepositorioControleAtualizacaoTabelas() {
        super(ControleAtualizacaoTabelas.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(ControleAtualizacaoTabelas entidade) {
        super.salvar(entidade);
    }

    public List<ControleAtualizacaoTabelas> listarUltimas(int quantidade) {
        return this.entityManager.createQuery("from ControleAtualizacaoTabelas c order by c.dataNotificacao desc").setMaxResults(quantidade).getResultList();
    }
}

