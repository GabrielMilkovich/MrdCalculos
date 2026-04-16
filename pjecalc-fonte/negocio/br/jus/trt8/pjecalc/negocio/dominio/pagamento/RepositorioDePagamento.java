/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDePagamento")
public class RepositorioDePagamento
extends RepositorioBase<Pagamento> {
    public RepositorioDePagamento() {
        super(Pagamento.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Pagamento> pesquisar(int firstResult, int maxResult, String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(firstResult, maxResult, orderBy, clausulaWhere, parametros);
    }

    public List<Pagamento> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public long obterQuantidade(String clausulaWhere, Object ... parametros) {
        return super.obterQuantidade(clausulaWhere, parametros);
    }

    public List<Pagamento> obterPagamentosDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from Pagamento where calculo.id = ? order by dataPagamento ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    @Override
    public void salvar(Pagamento pagamento) {
        super.salvar(pagamento, this.getEntidadesAgregadas());
    }

    private OneToManyRemover[] getEntidadesAgregadas() {
        return new OneToManyRemover[]{new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getHonorariosBrutosDevidosReclamante();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getHonorariosBrutosDevidosReclamadoOutrosDebitos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getMultasDevidasTerceiros();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getMultasDevidasTerceirosDebitosCobrarDoReclamante();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((Pagamento)entity).getMultasDevidasTerceirosOutrosDebitos();
            }
        }};
    }
}

