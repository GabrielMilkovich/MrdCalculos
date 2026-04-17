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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCombinacaoDeJuros")
public class RepositorioDeCombinacaoDeJuros
extends RepositorioBase<CombinacaoDeJuros> {
    public RepositorioDeCombinacaoDeJuros() {
        super(CombinacaoDeJuros.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerPorId(Long id) {
        this.entityManager.createQuery("delete from CombinacaoDeJuros where id = :id").setParameter("id", (Object)id).executeUpdate();
    }
}

