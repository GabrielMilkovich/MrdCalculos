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
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDebitosCobrarDoReclamante")
public class RepositorioDebitosCobrarDoReclamante
extends RepositorioBase<DebitosCobrarDoReclamante> {
    public RepositorioDebitosCobrarDoReclamante() {
        super(DebitosCobrarDoReclamante.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerTodos(Atualizacao atualizacao) {
        List<DebitosCobrarDoReclamante> lista = this.obterTodosDebitosCobrarDoReclamante(atualizacao);
        for (DebitosCobrarDoReclamante debitosCobrarDoReclamante : lista) {
            super.remover(debitosCobrarDoReclamante);
        }
    }

    public List<DebitosCobrarDoReclamante> obterUltimoRegistro(Atualizacao atualizacao) {
        Query query = this.entityManager.createQuery("from DebitosCobrarDoReclamante where atualizacao.id = ? order by dataFinalPeriodo desc limit 1");
        query.setParameter(1, (Object)atualizacao.getId());
        return query.getResultList();
    }

    protected List<DebitosCobrarDoReclamante> obterTodosDebitosCobrarDoReclamante(Atualizacao atualizacao) {
        Query query = this.entityManager.createQuery("from DebitosCobrarDoReclamante where atualizacao.id = ? order by dataFinalPeriodo asc");
        query.setParameter(1, (Object)atualizacao.getId());
        return query.getResultList();
    }

    public List<Atualizacao> obterAtualizacaoDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from Atualizacao where calculo.id = ?");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(DebitosCobrarDoReclamante debitoDoReclamante) {
        super.salvar(debitoDoReclamante);
    }
}

