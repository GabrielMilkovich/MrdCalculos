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
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioOutrosDebitosReclamado")
public class RepositorioOutrosDebitosDoReclamado
extends RepositorioBase<OutrosDebitosReclamado> {
    public RepositorioOutrosDebitosDoReclamado() {
        super(OutrosDebitosReclamado.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerTodos(Atualizacao atualizacao) {
        List<OutrosDebitosReclamado> lista = this.obterTodosOutrosDebitosReclamado(atualizacao);
        for (OutrosDebitosReclamado outrosDebitosReclamado : lista) {
            super.remover(outrosDebitosReclamado);
        }
    }

    public List<OutrosDebitosReclamado> obterUltimoRegistro(Atualizacao atualizacao) {
        Query query = this.entityManager.createQuery("from OutrosDebitosReclamado where atualizacao.id = ? order by dataFinalPeriodo desc limit 1");
        query.setParameter(1, (Object)atualizacao.getId());
        return query.getResultList();
    }

    protected List<OutrosDebitosReclamado> obterTodosOutrosDebitosReclamado(Atualizacao atualizacao) {
        Query query = this.entityManager.createQuery("from OutrosDebitosReclamado where atualizacao.id = ? order by dataFinalPeriodo asc");
        query.setParameter(1, (Object)atualizacao.getId());
        return query.getResultList();
    }

    public List<Atualizacao> obterAtualizacaoDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from Atualizacao where calculo.id = ?");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(OutrosDebitosReclamado outrosDebitosReclamado) {
        super.salvar(outrosDebitosReclamado);
    }
}

