/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCombinacaoDeIndice")
public class RepositorioDeCombinacaoDeIndice
extends RepositorioBase<CombinacaoDeIndice> {
    public RepositorioDeCombinacaoDeIndice() {
        super(CombinacaoDeIndice.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerPorId(Long id) {
        this.entityManager.createQuery("delete from CombinacaoDeIndice where id = :id").setParameter("id", (Object)id).executeUpdate();
    }
}

