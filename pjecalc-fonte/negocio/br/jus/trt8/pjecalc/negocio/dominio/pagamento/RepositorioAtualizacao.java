/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAtualizacao")
public class RepositorioAtualizacao
extends RepositorioBase<Atualizacao> {
    public RepositorioAtualizacao() {
        super(Atualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Atualizacao> obterAtualizacaoDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from Atualizacao where calculo.id = ?");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(Atualizacao atualizacao) {
        super.salvar(atualizacao);
    }
}

